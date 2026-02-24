# Pruebas

Aplicación web sencilla para extraer datos relevantes de un anuncio de mobile.de a partir de texto pegado por el usuario.

## Funcionalidades

- Extrae del texto:
  - Marca y modelo
  - Fecha de 1ª matriculación
  - Combustible
  - Cilindrada
  - Potencia
  - Emisiones
  - Nº de cilindros
- Si no encuentra **emisiones** o **nº de cilindros** en el texto, intenta inferirlos con una búsqueda en internet (DuckDuckGo Instant Answer API).

## Uso

1. Abre `index.html` en tu navegador.
2. Pega el contenido completo del anuncio en el área de texto.
3. Pulsa **Extraer datos**.
