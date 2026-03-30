# PokéWallet Web App

Proyecto web separado con las mismas funcionalidades de la app de escritorio:

- Carga manual de sets (sin llamadas automáticas al iniciar).
- Filtro de sets por nombre/código/idioma/set_id.
- Carga de cartas por set.
- Filtro de tabla por columna o en todas las columnas.
- Selección de cartas y carga de precios/URLs solo para las seleccionadas.

## Requisitos

- Python 3.10+
- Archivo `.env` en la raíz del workspace con:

```env
API_KEY=tu_api_key
```

## Instalación

```bash
cd web_app
pip install -r requirements.txt
```

## Ejecutar

```bash
python app.py
```

Abre [http://localhost:5000](http://localhost:5000).

## Deploy en Vercel

- En el proyecto de Vercel, configura **Root Directory** como `web_app` (si el repo incluye más carpetas).
- Añade la variable de entorno **`API_KEY`** en **Production** (y Preview si quieres).
- Si en el navegador ves un error tipo «Unexpected token `<`» al cargar sets, suele ser que la respuesta es **HTML** (página de error) en lugar de JSON: revisa que `API_KEY` esté definida y que el deploy use el `vercel.json` de esta carpeta.
