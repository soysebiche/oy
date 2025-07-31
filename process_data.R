# Fase 1 (Revisada): Procesamiento y Preparación de Datos para Comparación Anual
# Este script carga datos de IPUMS para dos años (2022 y 2023), calcula las métricas de OY,
# y exporta los datos en un formato ancho listo para la comparación en la web.

# 1. Cargar Librerías
# -----------------------------------------------------------------------------
library(ipumsr)
library(dplyr)
library(sf)
library(jsonlite)
library(tidyr)
library(tigris)

# 2. Cargar y Combinar Datos de IPUMS para Ambos Años
# -----------------------------------------------------------------------------
print("Cargando datos de IPUMS para 2022 (usa_00003)...")
ddi_2022 <- read_ipums_ddi("usa_00003.xml")
data_2022 <- read_ipums_micro(ddi_2022) %>% mutate(YEAR = 2022)

print("Cargando datos de IPUMS para 2023 (usa_00002)...")
ddi_2023 <- read_ipums_ddi("usa_00002.xml")
data_2023 <- read_ipums_micro(ddi_2023) %>% mutate(YEAR = 2023)

print("Combinando datos de ambos años...")
data_ipums_combined <- bind_rows(data_2022, data_2023)
print(paste("Datos combinados. Dimensiones:", dim(data_ipums_combined)[1], "filas"))

# 3. Calcular Métricas de Opportunity Youth (OY)
# -----------------------------------------------------------------------------
print("Procesando datos combinados para calcular Opportunity Youth...")
processed_data <- data_ipums_combined %>%
  filter(MET2013 > 0 & MET2013 != 99999) %>%
  mutate(
    race_ethnicity = case_when(
      HISPAN != 0 ~ "Hispanic",
      RACE == 1 ~ "White",
      RACE == 2 ~ "Black",
      RACE == 3 ~ "American Indian or Alaska Native",
      RACE %in% c(4, 5, 6) ~ "Asian or Pacific Islander",
      RACE == 7 ~ "Other",
      RACE == 8 ~ "Two or More Races",
      TRUE ~ "Other"
    ),
    gender = case_when(SEX == 1 ~ "Male", SEX == 2 ~ "Female"),
    opportunity_youth = (SCHOOL == 1) & (EMPSTAT %in% c(2, 3)),
    weight = PERWT
  )

# 4. Agregar Datos y Pivotar a Formato Ancho
# -----------------------------------------------------------------------------
print("Agregando datos por área metropolitana y año...")

# 4.1. Resumen principal por área metropolitana y año
metro_summary_long <- processed_data %>%
  group_by(MET2013, YEAR) %>%
  summarise(
    total_youth_pop = sum(weight, na.rm = TRUE),
    total_oy = sum(weight[opportunity_youth], na.rm = TRUE),
    .groups = 'drop'
  ) %>%
  mutate(oy_percentage = round((total_oy / total_youth_pop) * 100, 2))

print("Pivotando el resumen principal a formato ancho...")
metro_summary_wide <- metro_summary_long %>%
  pivot_wider(
    names_from = YEAR,
    values_from = c(total_youth_pop, total_oy, oy_percentage),
    names_sep = "_"
  ) %>%
  rename(GEOID = MET2013) %>%
  mutate(GEOID = as.character(GEOID))

# 4.2. Tabla detallada por raza/género para cada área metropolitana
metro_detailed_long <- processed_data %>%
  group_by(MET2013, YEAR, race_ethnicity, gender) %>%
  summarise(
    youth_population = round(sum(weight, na.rm = TRUE)),
    total_opportunity_youth = round(sum(weight[opportunity_youth], na.rm = TRUE)),
    .groups = 'drop'
  ) %>%
  mutate(opp_youth_percent = round((total_opportunity_youth / youth_population) * 100, 1))

print("Pivotando la tabla detallada a formato ancho...")
metro_detailed_wide <- metro_detailed_long %>%
  pivot_wider(
    names_from = YEAR,
    values_from = c(youth_population, total_opportunity_youth, opp_youth_percent),
    names_sep = "_"
  ) %>%
  rename(GEOID = MET2013) %>%
  mutate(GEOID = as.character(GEOID))

# 5. Obtener Geometrías y Unir
# -----------------------------------------------------------------------------
print("Descargando geometrías y uniendo con datos...")
metro_geometries <- core_based_statistical_areas(cb = TRUE, year = 2020) %>%
  select(GEOID, NAME, geometry)

metro_data_geojson <- metro_geometries %>%
  left_join(metro_summary_wide, by = "GEOID") %>%
  filter(!is.na(total_youth_pop_2023) | !is.na(total_youth_pop_2022))

# 6. Exportar a Archivos para la Web
# -----------------------------------------------------------------------------
print("Exportando archivos actualizados a la carpeta web/data/...")

# 6.1. Exportar el archivo GeoJSON principal
output_geojson_path <- "web/data/metro_areas_oy.geojson"
st_write(metro_data_geojson, output_geojson_path, driver = "GeoJSON", delete_dsn = TRUE)
print(paste("GeoJSON guardado en:", output_geojson_path))

# 6.2. Exportar la tabla detallada como un único archivo JSON
output_json_path <- "web/data/metro_detailed_data.json"
nested_detailed_data <- metro_detailed_wide %>% 
  group_by(GEOID) %>% 
  nest()

json_list <- setNames(nested_detailed_data$data, nested_detailed_data$GEOID)
json_output <- toJSON(json_list, pretty = TRUE, na = "null")
write(json_output, output_json_path)
print(paste("JSON detallado guardado en:", output_json_path))

print("¡Procesamiento completado con éxito!")