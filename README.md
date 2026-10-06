# sociales ⋆˙⟡

Sitio web estático para la red social del curso de Ciencias Sociales.

## Incluye
- Inicio de sesión y creación de cuentas.
- Perfil personalizable: nombre, bio, color y foto.
- Feed tipo Tumblr: publicaciones, imágenes, videos, likes, comentarios y eliminación de publicaciones propias.
- Apartado de Noticias: publicar y eliminar noticias propias.
- Calendario colaborativo: cualquier usuario puede agregar y eliminar fechas.
- Búsqueda de personas, publicaciones y noticias.
- Modo claro/oscuro.
- Animaciones suaves y diseño responsive para celular.
- Banner original incluido en `assets/banner-sociales.png`.

## Cómo usarlo
Abrí `index.html` en un navegador moderno.

Esta versión funciona como prototipo local: los datos se guardan en `localStorage` del navegador. Por eso las cuentas y publicaciones no se sincronizan entre dispositivos ni entre compañeros.

## Para convertirlo en una red social real
Hace falta un backend con autenticación, base de datos, almacenamiento de imágenes/videos, moderación y reglas de seguridad. Una opción sencilla sería Supabase o Firebase.
