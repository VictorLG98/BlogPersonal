import logging
import os
from typing import Any

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request
from werkzeug.exceptions import HTTPException

BASE_URL = "https://api.pokewallet.io"


def create_app() -> Flask:
    load_dotenv()
    api_key = os.environ.get("API_KEY") or os.getenv("API_KEY")
    print("API_KEY:", api_key)

    app = Flask(__name__)

    @app.errorhandler(Exception)
    def api_json_errors(error: BaseException):
        if not request.path.startswith("/api"):
            raise error
        if isinstance(error, HTTPException):
            return jsonify({"error": error.description or str(error)}), error.code or 500
        logging.exception("Error en ruta API")
        message = str(error) if str(error) else error.__class__.__name__
        return jsonify({"error": message}), 500

    def api_get(path: str, *, params: dict[str, Any] | None = None) -> dict[str, Any]:
        if not api_key:
            raise ValueError("Falta API_KEY. Configúrala en variables de entorno de Vercel (Project Settings).")
        response = requests.get(
            f"{BASE_URL}{path}",
            headers={"X-API-Key": api_key},
            params=params,
            timeout=30,
        )
        response.raise_for_status()
        return response.json()

    @app.get("/")
    def index():
        return render_template("index.html")

    @app.get("/api/sets")
    def get_sets():
        try:
            payload = api_get("/sets")
        except ValueError as error:
            return jsonify({"error": str(error)}), 503
        except requests.RequestException as error:
            return jsonify({"error": f"Error al contactar PokéWallet: {error}"}), 502
        if not payload.get("success"):
            return jsonify({"error": "La API no devolvió success al cargar sets."}), 502
        sets_data = payload.get("data", [])
        sets_data.sort(key=lambda item: ((item.get("name") or "").lower(), item.get("set_id") or ""))
        return jsonify({"sets": sets_data})

    @app.get("/api/sets/<set_id>/cards")
    def get_set_cards(set_id: str):
        try:
            cards: list[dict[str, Any]] = []
            page = 1
            limit = 200
            total_cards = None

            while True:
                payload = api_get(f"/sets/{set_id}", params={"page": page, "limit": limit})
                if payload.get("disambiguation"):
                    return jsonify({"error": "Set ambiguo. Usa un set_id único."}), 400
                if not payload.get("success"):
                    return jsonify({"error": "No se pudieron cargar las cartas del set."}), 502

                if total_cards is None:
                    total_cards = payload.get("set", {}).get("total_cards")

                page_cards = payload.get("cards", [])
                if not page_cards:
                    break

                cards.extend(page_cards)
                if total_cards is not None and len(cards) >= int(total_cards):
                    break
                if len(page_cards) < limit:
                    break
                page += 1

            return jsonify({"cards": cards, "count": len(cards)})
        except ValueError as error:
            return jsonify({"error": str(error)}), 503
        except requests.RequestException as error:
            return jsonify({"error": f"Error al contactar PokéWallet: {error}"}), 502

    @app.post("/api/cards/details")
    def get_cards_details():
        try:
            body = request.get_json(silent=True) or {}
            ids = body.get("card_ids", [])
            if not isinstance(ids, list) or not ids:
                return jsonify({"error": "Debes enviar card_ids con al menos un id."}), 400

            details: list[dict[str, Any]] = []
            for card_id in ids:
                try:
                    details.append(api_get(f"/cards/{card_id}"))
                except Exception:
                    details.append({"id": card_id, "error": "No se pudo cargar el detalle"})
            return jsonify({"details": details})
        except ValueError as error:
            return jsonify({"error": str(error)}), 503
        except requests.RequestException as error:
            return jsonify({"error": f"Error al contactar PokéWallet: {error}"}), 502

    return app


app = create_app()


if __name__ == "__main__":
    app.run(debug=True, port=5000)
