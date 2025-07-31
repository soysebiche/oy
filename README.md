# Análisis Interactivo de Juventud Desconectada (Opportunity Youth) en Áreas Metropolitanas de EE. UU.

## Resumen del Proyecto

Este proyecto tiene como objetivo crear una visualización de datos interactiva para analizar el número y porcentaje de **Juventud Desconectada (Opportunity Youth - OY)** en las principales áreas metropolitanas de Estados Unidos. La visualización se centrará en los datos de los años 2020 y 2023, permitiendo una comparación temporal.

El proyecto se inspira en la funcionalidad y el diseño del visualizador de [Measure of America](https://www.measureofamerica.org/DYInteractive/), replicando específicamente la sección "BY METRO AREA".

La idea es utilizar datos de IPUMS (previamente descargados) y procesarlos con R o Python para generar los insumos necesarios para una visualización web.

## Características Principales

1.  **Mapa Interactivo:** Un mapa de burbujas o coroplético de las áreas metropolitanas de EE. UU. que muestre la tasa de jóvenes desconectados.
2.  **Tabla Desagregada:** Una tabla que muestre los datos de OY desagregados por género y raza/etnia para cada área metropolitana.
3.  **Interactividad:** Al pasar el mouse o hacer clic en un área metropolitana, se mostrará información detallada (nombre del área, % de OY, número total de OY, y el desglose por subgrupos).
4.  **Comparación Anual:** Funcionalidad para cambiar la visualización entre los datos de 2020 y 2023.

## Fuente de Datos

-   **Datos Primarios:** [IPUMS USA](https://usa.ipums.org/usa/), American Community Survey (ACS) 1-year estimates.
-   **Años:** 2020 y 2023.
-   **Población de Interés:** Jóvenes entre 16 y 24 años que no están matriculados en la escuela y no se encuentran trabajando.

## Stack Tecnológico Propuesto

-   **Procesamiento de Datos:**
    -   **R:** Usando librerías como `dplyr` para manipulación, `sf` para datos espaciales.
    -   **Python:** Usando `pandas` para manipulación y `geopandas` para datos espaciales.
    -   El objetivo es generar archivos limpios en formato `.csv` o `.json`/`.geojson` que puedan ser consumidos fácilmente por la web.
-   **Frontend (Visualización):**
    -   **HTML5, CSS3, JavaScript (ES6+)**
    -   **D3.js:** Para la creación de las visualizaciones de datos (mapa de burbujas y tablas dinámicas).
    -   **TopoJSON/GeoJSON:** Para los datos geográficos de las áreas metropolitanas.

## Estructura del Proyecto (Sugerida)

```
/
|-- data/
|   |-- raw/                # Datos brutos de IPUMS
|   |-- processed/          # Datos limpios y agregados (ej. metro_data_2020.json)
|-- processing_scripts/
|   |-- 01_clean_data.R     # Script para limpiar y procesar los datos de IPUMS
|-- docs/                   # Contendrá la aplicación web final
|   |-- index.html          # Estructura principal de la página
|   |-- style.css           # Estilos
|   |-- main.js             # Lógica de D3.js para la visualización
|   |-- data/               # Datos procesados listos para ser leídos por JS
|       |-- metro_data_2020.json
|       |-- metro_data_2023.json
|-- README.md               # Este archivo
```

## Plan de Trabajo

1.  **Procesamiento de Datos:**
    -   Definir las variables necesarias de IPUMS (METROAREA, YEAR, AGE, SCHOOL, EMPSTAT, RACE, SEX).
    -   Escribir un script (R o Python) para filtrar la población (16-24 años).
    -   Calcular el estatus de "Opportunity Youth" para cada individuo.
    -   Agregar los datos por área metropolitana, género y raza para los años 2020 y 2023.
    -   Exportar los resultados a formato JSON.
2.  **Desarrollo Frontend:**
    -   Diseñar la estructura HTML base (`index.html`).
    -   Crear la visualización del mapa de burbujas con D3.js.
    -   Cargar los datos JSON y vincularlos a los elementos del mapa.
    -   Implementar la interactividad (tooltips, clics).
    -   Crear la tabla dinámica que se actualice según la selección en el mapa.
    -   Añadir controles para cambiar entre los años 2020 y 2023.
    -   Aplicar estilos CSS para que sea visualmente atractivo y claro.
