# Academia PayGas WordPress Plugin

Plugin de WordPress para la Academia PayGas que crea Custom Post Types y una REST API completa para gestionar el sistema de aprendizaje.

## Características

- Custom Post Types para todas las entidades de la academia
- Meta boxes para campos personalizados
- REST API completa con operaciones CRUD
- Roles personalizados para usuarios
- Sistema de certificados
- Sistema de quizzes y evaluaciones
- Seguimiento de progreso
- Sistema de notificaciones
- Logs de actividad

## Instalación

1. Copiar la carpeta `wordpress-plugin-academia-paygas` al directorio `/wp-content/plugins/`
2. Activar el plugin desde el panel de administración de WordPress
3. Los Custom Post Types y endpoints REST API estarán disponibles automáticamente

## Custom Post Types

- **ap_trilha** - Trilhas de aprendizaje
- **ap_modulo** - Módulos de las trilhas
- **ap_aula** - Aulas/lecciones
- **ap_quiz** - Quizzes y evaluaciones
- **ap_certificate** - Certificados
- **ap_notification** - Notificaciones
- **ap_activity_log** - Logs de actividad
- **ap_quiz_response** - Respuestas de quizzes
- **ap_progresso** - Progreso de usuarios
- **ap_trilha_atendente** - Asignación de trilhas a atendentes

## Roles de Usuario

- **academia_admin** - Admin PayGas (acceso completo)
- **academia_gestor** - Gestor de Posto (acceso limitado)
- **academia_atendente** - Atendente (solo lectura)

## REST API Endpoints

Base URL: `/wp-json/academia-paygas/v1`

### Users
- `GET /users` - Listar todos los usuarios
- `GET /users/{id}` - Obtener un usuario
- `POST /users` - Crear un usuario
- `PUT /users/{id}` - Actualizar un usuario
- `DELETE /users/{id}` - Eliminar un usuario

### Trilhas
- `GET /trilhas` - Listar todas las trilhas
- `GET /trilhas/{id}` - Obtener una trilha
- `POST /trilhas` - Crear una trilha
- `PUT /trilhas/{id}` - Actualizar una trilha
- `DELETE /trilhas/{id}` - Eliminar una trilha

### Modulos
- `GET /modulos` - Listar todos los módulos (param: `trilha_id`)
- `GET /modulos/{id}` - Obtener un módulo
- `POST /modulos` - Crear un módulo
- `PUT /modulos/{id}` - Actualizar un módulo
- `DELETE /modulos/{id}` - Eliminar un módulo

### Aulas
- `GET /aulas` - Listar todas las aulas (param: `modulo_id`)
- `GET /aulas/{id}` - Obtener una aula
- `POST /aulas` - Crear una aula
- `PUT /aulas/{id}` - Actualizar una aula
- `DELETE /aulas/{id}` - Eliminar una aula

### Quizzes
- `GET /quizzes` - Listar todos los quizzes (param: `aula_id`)
- `GET /quizzes/{id}` - Obtener un quiz
- `POST /quizzes` - Crear un quiz
- `PUT /quizzes/{id}` - Actualizar un quiz
- `DELETE /quizzes/{id}` - Eliminar un quiz

### Quiz Responses
- `GET /quiz-responses` - Listar respuestas (params: `user_id`, `quiz_id`)
- `POST /quiz-responses` - Crear una respuesta

### Progresso
- `GET /progresso` - Listar progreso (params: `user_id`, `aula_id`)
- `POST /progresso` - Crear registro de progreso
- `PUT /progresso/{id}` - Actualizar progreso

### Certificados
- `GET /certificados` - Listar certificados (params: `user_id`, `trilha_id`)
- `GET /certificados/{id}` - Obtener un certificado
- `POST /certificados` - Crear un certificado
- `PUT /certificados/{id}` - Actualizar un certificado

### Notificaciones
- `GET /notifications` - Listar notificaciones (params: `to_id`, `from_id`)
- `POST /notifications` - Crear una notificación
- `PUT /notifications/{id}` - Actualizar notificación (marcar como leída)

### Activity Logs
- `GET /activity-logs` - Listar logs (param: `user_id`)
- `POST /activity-logs` - Crear un log

### Trilha Atendente
- `GET /trilha-atendente` - Listar asignaciones (params: `user_id`, `trilha_id`)
- `POST /trilha-atendente` - Asignar trilha a atendente
- `DELETE /trilha-atendente/{id}` - Eliminar asignación

## Ejemplos de Uso

### Crear una Trilha

```bash
curl -X POST https://tu-sitio.com/wp-json/academia-paygas/v1/trilhas \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Excelência no Atendimento",
    "descricao": "Aprenda as melhores práticas de atendimento ao cliente",
    "icon": "dashicons-book-alt",
    "color": "#3b82f6",
    "obrigatorio": true
  }'
```

### Crear un Usuario

```bash
curl -X POST https://tu-sitio.com/wp-json/academia-paygas/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@ejemplo.com",
    "nome": "Juan Pérez",
    "senha": "password123",
    "role": "academia_atendente"
  }'
```

### Obtener Trilhas

```bash
curl https://tu-sitio.com/wp-json/academia-paygas/v1/trilhas
```

## Estructura del Plugin

```
wordpress-plugin-academia-paygas/
├── academia-paygas.php       # Archivo principal
├── includes/
│   ├── post-types.php        # Registro de Custom Post Types
│   ├── meta-boxes.php        # Meta boxes para campos personalizados
│   └── rest-api.php          # Endpoints REST API
└── README.md                 # Documentación
```

## Requisitos

- WordPress 5.0 o superior
- PHP 7.4 o superior

## Seguridad

- Todos los endpoints requieren autenticación
- Validación y sanitización de datos
- Verificación de capacidades de usuario
- Nonces para formularios

## Soporte

Para soporte, contactar al equipo de desarrollo de PayGas.

## Licencia

GPL v2 o posterior
