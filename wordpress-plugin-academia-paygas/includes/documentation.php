<?php
/**
 * Documentation Endpoint for Academia PayGas REST API
 * Serves both JSON (for AI agents) and HTML (for humans)
 */

if (!defined('ABSPATH')) {
    exit;
}

// Routes are now registered via Academia_Docs class in class-academia-docs.php
// to avoid duplicate registration conflicts

function academia_paygas_get_api_spec() {
    return array(
        'openapi' => '3.1.0',
        'info' => array(
            'title' => 'Academia PayGas REST API',
            'description' => 'API REST para el sistema de aprendizaje Academia PayGas. Gestiona trilhas, modulos, aulas, quizzes, certificados, usuarios, notificaciones y progreso.',
            'version' => '1.0.0',
            'contact' => array(
                'name' => 'PayGas',
                'url' => 'https://paygas.com',
            ),
        ),
        'servers' => array(
            array(
                'url' => '{protocol}://{host}/wp-json/academia-paygas/v1',
                'description' => 'WordPress REST API',
                'variables' => array(
                    'protocol' => array('default' => 'https'),
                    'host' => array('default' => 'tu-sitio.com'),
                ),
            ),
        ),
        'authentication' => array(
            'type' => 'wordpress_cookie',
            'description' => 'Autenticacion via WordPress cookie o Application Passwords. Todos los endpoints requieren permiso `read` como minimo.',
        ),
        'roles' => array(
            'academia_admin' => array(
                'description' => 'Admin PayGas - Acceso completo a todas las operaciones CRUD',
                'permissions' => array('read', 'edit_posts', 'delete_posts', 'publish_posts', 'upload_files', 'manage_categories', 'manage_options'),
            ),
            'academia_gestor' => array(
                'description' => 'Gestor de Posto - Acceso limitado, puede editar pero no eliminar',
                'permissions' => array('read', 'edit_posts', 'upload_files'),
            ),
            'academia_atendente' => array(
                'description' => 'Atendente - Solo lectura',
                'permissions' => array('read'),
            ),
        ),
        'custom_post_types' => array(
            'ap_aula' => array('label' => 'Aulas', 'description' => 'Aulas/lecciones (CPT principal)'),
            'ap_quiz' => array('label' => 'Quizzes', 'description' => 'Quizzes y evaluaciones'),
            'ap_quiz_response' => array('label' => 'Quiz Responses', 'description' => 'Respuestas de usuarios a quizzes'),
            'ap_certificate' => array('label' => 'Certificados', 'description' => 'Certificados de completacion'),
            'ap_notification' => array('label' => 'Notificaciones', 'description' => 'Notificaciones entre usuarios'),
            'ap_activity_log' => array('label' => 'Activity Logs', 'description' => 'Logs de actividad del sistema'),
            'ap_progresso' => array('label' => 'Progressos', 'description' => 'Registro de progreso de usuarios'),
            'ap_trilha_atendente' => array('label' => 'Trilhas Atendentes', 'description' => 'Asignacion de trilhas a atendentes'),
        ),
        'taxonomies' => array(
            'ap_trilha' => array('label' => 'Trilhas', 'description' => 'Taxonomía de trilhas de aprendizaje (jerárquica)'),
            'ap_modulo' => array('label' => 'Modulos', 'description' => 'Taxonomía de módulos dentro de trilhas (jerárquica)'),
        ),
        'endpoints' => array(
            // USERS
            array(
                'path' => '/users',
                'method' => 'GET',
                'summary' => 'Listar todos los usuarios',
                'description' => 'Obtiene la lista de todos los usuarios de la academia. Admin ve todos, Gestor ve solo sus atendentes.',
                'tags' => array('Users'),
                'permission' => 'academia_admin, academia_gestor',
                'parameters' => array(),
                'response' => array(
                    'type' => 'array',
                    'items' => array(
                        'id' => 'integer',
                        'email' => 'string (email)',
                        'nome' => 'string',
                        'role' => 'string (academia_admin|academia_gestor|academia_atendente)',
                        'gestorId' => 'integer|null',
                        'createdAt' => 'string (ISO 8601 datetime)',
                        'lastLogin' => 'string (ISO 8601 datetime)|null',
                    ),
                ),
            ),
            array(
                'path' => '/users/{id}',
                'method' => 'GET',
                'summary' => 'Obtener un usuario por ID',
                'tags' => array('Users'),
                'permission' => 'academia_admin, academia_gestor',
                'parameters' => array(
                    array('name' => 'id', 'in' => 'path', 'required' => true, 'type' => 'integer'),
                ),
                'response' => array(
                    'id' => 'integer',
                    'email' => 'string',
                    'nome' => 'string',
                    'role' => 'string',
                    'gestorId' => 'integer|null',
                    'createdAt' => 'string',
                    'lastLogin' => 'string|null',
                ),
            ),
            array(
                'path' => '/users',
                'method' => 'POST',
                'summary' => 'Crear un nuevo usuario',
                'tags' => array('Users'),
                'permission' => 'academia_admin, academia_gestor',
                'parameters' => array(),
                'request_body' => array(
                    'required' => array('email', 'nome', 'senha', 'role'),
                    'properties' => array(
                        'email' => array('type' => 'string', 'format' => 'email', 'description' => 'Email del usuario (unico)'),
                        'nome' => array('type' => 'string', 'description' => 'Nombre completo'),
                        'senha' => array('type' => 'string', 'description' => 'Contrasena (hasheada automaticamente)'),
                        'role' => array('type' => 'string', 'enum' => array('academia_admin', 'academia_gestor', 'academia_atendente')),
                        'gestorId' => array('type' => 'integer', 'description' => 'ID del gestor si el rol es academia_atendente'),
                    ),
                ),
            ),
            array(
                'path' => '/users/{id}',
                'method' => 'PUT',
                'summary' => 'Actualizar un usuario',
                'tags' => array('Users'),
                'permission' => 'academia_admin',
                'parameters' => array(
                    array('name' => 'id', 'in' => 'path', 'required' => true, 'type' => 'integer'),
                ),
                'request_body' => array(
                    'optional' => array('nome', 'email', 'senha', 'role', 'gestorId'),
                ),
            ),
            array(
                'path' => '/users/{id}',
                'method' => 'DELETE',
                'summary' => 'Eliminar un usuario',
                'tags' => array('Users'),
                'permission' => 'academia_admin',
                'parameters' => array(
                    array('name' => 'id', 'in' => 'path', 'required' => true, 'type' => 'integer'),
                ),
                'response' => array('message' => 'string'),
            ),

            // TRILHAS
            array(
                'path' => '/trilhas',
                'method' => 'GET',
                'summary' => 'Listar todas las trilhas de aprendizaje',
                'tags' => array('Trilhas'),
                'permission' => 'academia_admin, academia_gestor, academia_atendente',
                'parameters' => array(),
                'response' => array(
                    'type' => 'array',
                    'items' => array(
                        'id' => 'integer',
                        'titulo' => 'string',
                        'descricao' => 'string (HTML)',
                        'icon' => 'string (dashicons class)',
                        'color' => 'string (hex color)',
                        'obrigatorio' => 'boolean',
                        'createdAt' => 'string (ISO 8601)',
                        'updatedAt' => 'string (ISO 8601)',
                    ),
                ),
            ),
            array(
                'path' => '/trilhas/{id}',
                'method' => 'GET',
                'summary' => 'Obtener una trilha por ID',
                'tags' => array('Trilhas'),
                'permission' => 'academia_admin, academia_gestor, academia_atendente',
                'parameters' => array(
                    array('name' => 'id', 'in' => 'path', 'required' => true, 'type' => 'integer'),
                ),
            ),
            array(
                'path' => '/trilhas',
                'method' => 'POST',
                'summary' => 'Crear una nueva trilha',
                'tags' => array('Trilhas'),
                'permission' => 'academia_admin',
                'request_body' => array(
                    'required' => array('titulo'),
                    'optional' => array('descricao', 'icon', 'color', 'obrigatorio'),
                    'properties' => array(
                        'titulo' => array('type' => 'string', 'description' => 'Titulo de la trilha'),
                        'descricao' => array('type' => 'string', 'description' => 'Descripcion (puede contener HTML)'),
                        'icon' => array('type' => 'string', 'description' => 'Clase Dashicons (ej: dashicons-book-alt)'),
                        'color' => array('type' => 'string', 'description' => 'Color hex (ej: #3b82f6)'),
                        'obrigatorio' => array('type' => 'boolean', 'description' => 'Si es obligatoria'),
                    ),
                ),
            ),
            array(
                'path' => '/trilhas/{id}',
                'method' => 'PUT',
                'summary' => 'Actualizar una trilha',
                'tags' => array('Trilhas'),
                'permission' => 'academia_admin',
                'parameters' => array(
                    array('name' => 'id', 'in' => 'path', 'required' => true, 'type' => 'integer'),
                ),
                'request_body' => array('optional' => array('titulo', 'descricao', 'icon', 'color', 'obrigatorio')),
            ),
            array(
                'path' => '/trilhas/{id}',
                'method' => 'DELETE',
                'summary' => 'Eliminar una trilha',
                'tags' => array('Trilhas'),
                'permission' => 'academia_admin',
                'parameters' => array(
                    array('name' => 'id', 'in' => 'path', 'required' => true, 'type' => 'integer'),
                ),
            ),

            // MODULOS
            array(
                'path' => '/modulos',
                'method' => 'GET',
                'summary' => 'Listar todos los modulos',
                'description' => 'Obtiene modulos. Filtrar por trilha_id opcionalmente.',
                'tags' => array('Modulos'),
                'permission' => 'academia_admin, academia_gestor',
                'parameters' => array(
                    array('name' => 'trilha_id', 'in' => 'query', 'required' => false, 'type' => 'integer', 'description' => 'Filtrar por ID de trilha'),
                ),
                'response' => array(
                    'type' => 'array',
                    'items' => array(
                        'id' => 'integer',
                        'trilhaId' => 'integer',
                        'titulo' => 'string',
                        'descricao' => 'string',
                        'ordem' => 'integer',
                        'videoUrl' => 'string|null (URL del video)',
                        'videoInicio' => 'integer|null (segundos)',
                        'videoFim' => 'integer|null (segundos)',
                        'createdAt' => 'string',
                        'updatedAt' => 'string',
                    ),
                ),
            ),
            array(
                'path' => '/modulos/{id}',
                'method' => 'GET',
                'summary' => 'Obtener un modulo por ID',
                'tags' => array('Modulos'),
                'permission' => 'academia_admin, academia_gestor',
                'parameters' => array(
                    array('name' => 'id', 'in' => 'path', 'required' => true, 'type' => 'integer'),
                ),
            ),
            array(
                'path' => '/modulos',
                'method' => 'POST',
                'summary' => 'Crear un nuevo modulo',
                'tags' => array('Modulos'),
                'permission' => 'academia_admin, academia_gestor',
                'request_body' => array(
                    'required' => array('trilhaId', 'titulo'),
                    'optional' => array('descricao', 'ordem', 'videoUrl', 'videoInicio', 'videoFim'),
                    'properties' => array(
                        'trilhaId' => array('type' => 'integer', 'description' => 'ID de la trilha padre'),
                        'titulo' => array('type' => 'string'),
                        'descricao' => array('type' => 'string'),
                        'ordem' => array('type' => 'integer', 'description' => 'Orden de visualizacion'),
                        'videoUrl' => array('type' => 'string', 'format' => 'uri'),
                        'videoInicio' => array('type' => 'integer', 'description' => 'Segundos de inicio del video'),
                        'videoFim' => array('type' => 'integer', 'description' => 'Segundos de fin del video'),
                    ),
                ),
            ),
            array(
                'path' => '/modulos/{id}',
                'method' => 'PUT',
                'summary' => 'Actualizar un modulo',
                'tags' => array('Modulos'),
                'permission' => 'academia_admin, academia_gestor',
                'parameters' => array(
                    array('name' => 'id', 'in' => 'path', 'required' => true, 'type' => 'integer'),
                ),
                'request_body' => array('optional' => array('titulo', 'descricao', 'ordem', 'videoUrl', 'videoInicio', 'videoFim')),
            ),
            array(
                'path' => '/modulos/{id}',
                'method' => 'DELETE',
                'summary' => 'Eliminar un modulo',
                'tags' => array('Modulos'),
                'permission' => 'academia_admin',
                'parameters' => array(
                    array('name' => 'id', 'in' => 'path', 'required' => true, 'type' => 'integer'),
                ),
            ),

            // AULAS
            array(
                'path' => '/aulas',
                'method' => 'GET',
                'summary' => 'Listar todas las aulas',
                'tags' => array('Aulas'),
                'permission' => 'academia_admin, academia_gestor, academia_atendente',
                'parameters' => array(
                    array('name' => 'modulo_id', 'in' => 'query', 'required' => false, 'type' => 'integer'),
                ),
                'response' => array(
                    'type' => 'array',
                    'items' => array(
                        'id' => 'integer',
                        'moduloId' => 'integer',
                        'titulo' => 'string',
                        'descricao' => 'string',
                        'ordem' => 'integer',
                        'videoUrl' => 'string|null',
                        'videoInicio' => 'integer|null',
                        'videoFim' => 'integer|null',
                        'duracaoMin' => 'integer|null',
                        'createdAt' => 'string',
                        'updatedAt' => 'string',
                    ),
                ),
            ),
            array(
                'path' => '/aulas/{id}',
                'method' => 'GET',
                'summary' => 'Obtener una aula por ID',
                'tags' => array('Aulas'),
                'permission' => 'academia_admin, academia_gestor, academia_atendente',
                'parameters' => array(
                    array('name' => 'id', 'in' => 'path', 'required' => true, 'type' => 'integer'),
                ),
            ),
            array(
                'path' => '/aulas',
                'method' => 'POST',
                'summary' => 'Crear una nueva aula',
                'tags' => array('Aulas'),
                'permission' => 'academia_admin, academia_gestor',
                'request_body' => array(
                    'required' => array('moduloId', 'titulo'),
                    'optional' => array('descricao', 'ordem', 'videoUrl', 'videoInicio', 'videoFim', 'duracaoMin'),
                ),
            ),
            array(
                'path' => '/aulas/{id}',
                'method' => 'PUT',
                'summary' => 'Actualizar una aula',
                'tags' => array('Aulas'),
                'permission' => 'academia_admin, academia_gestor',
                'parameters' => array(
                    array('name' => 'id', 'in' => 'path', 'required' => true, 'type' => 'integer'),
                ),
                'request_body' => array('optional' => array('titulo', 'descricao', 'ordem', 'videoUrl', 'videoInicio', 'videoFim', 'duracaoMin')),
            ),
            array(
                'path' => '/aulas/{id}',
                'method' => 'DELETE',
                'summary' => 'Eliminar una aula',
                'tags' => array('Aulas'),
                'permission' => 'academia_admin',
                'parameters' => array(
                    array('name' => 'id', 'in' => 'path', 'required' => true, 'type' => 'integer'),
                ),
            ),

            // QUIZZES
            array(
                'path' => '/quizzes',
                'method' => 'GET',
                'summary' => 'Listar todos los quizzes',
                'tags' => array('Quizzes'),
                'permission' => 'academia_admin, academia_gestor',
                'parameters' => array(
                    array('name' => 'aula_id', 'in' => 'query', 'required' => false, 'type' => 'integer'),
                ),
                'response' => array(
                    'type' => 'array',
                    'items' => array(
                        'id' => 'integer',
                        'aulaId' => 'integer',
                        'titulo' => 'string',
                        'autoGerarCertificado' => 'boolean',
                        'perguntas' => 'array of QuizPergunta',
                        'createdAt' => 'string',
                        'updatedAt' => 'string',
                    ),
                ),
            ),
            array(
                'path' => '/quizzes/{id}',
                'method' => 'GET',
                'summary' => 'Obtener un quiz por ID con sus preguntas',
                'tags' => array('Quizzes'),
                'permission' => 'academia_admin, academia_gestor',
                'parameters' => array(
                    array('name' => 'id', 'in' => 'path', 'required' => true, 'type' => 'integer'),
                ),
            ),
            array(
                'path' => '/quizzes',
                'method' => 'POST',
                'summary' => 'Crear un nuevo quiz',
                'tags' => array('Quizzes'),
                'permission' => 'academia_admin, academia_gestor',
                'request_body' => array(
                    'required' => array('titulo'),
                    'optional' => array('aulaId', 'autoGerarCertificado', 'perguntas'),
                    'properties' => array(
                        'aulaId' => array('type' => 'integer'),
                        'titulo' => array('type' => 'string'),
                        'autoGerarCertificado' => array('type' => 'boolean', 'description' => 'Auto-generar certificado al aprobar'),
                        'perguntas' => array(
                            'type' => 'array',
                            'description' => 'Array de preguntas del quiz',
                            'items' => array(
                                'pergunta' => 'string (texto de la pregunta)',
                                'opcao_a' => 'string',
                                'opcao_b' => 'string',
                                'opcao_c' => 'string (opcional)',
                                'opcao_d' => 'string (opcional)',
                                'correta' => 'string (A|B|C|D)',
                                'ordem' => 'integer',
                            ),
                        ),
                    ),
                ),
            ),
            array(
                'path' => '/quizzes/{id}',
                'method' => 'PUT',
                'summary' => 'Actualizar un quiz',
                'tags' => array('Quizzes'),
                'permission' => 'academia_admin, academia_gestor',
                'parameters' => array(
                    array('name' => 'id', 'in' => 'path', 'required' => true, 'type' => 'integer'),
                ),
                'request_body' => array('optional' => array('titulo', 'aulaId', 'autoGerarCertificado', 'perguntas')),
            ),
            array(
                'path' => '/quizzes/{id}',
                'method' => 'DELETE',
                'summary' => 'Eliminar un quiz',
                'tags' => array('Quizzes'),
                'permission' => 'academia_admin',
                'parameters' => array(
                    array('name' => 'id', 'in' => 'path', 'required' => true, 'type' => 'integer'),
                ),
            ),

            // QUIZ RESPONSES
            array(
                'path' => '/quiz-responses',
                'method' => 'GET',
                'summary' => 'Listar respuestas de quizzes',
                'tags' => array('Quiz Responses'),
                'permission' => 'academia_admin, academia_gestor',
                'parameters' => array(
                    array('name' => 'user_id', 'in' => 'query', 'required' => false, 'type' => 'integer'),
                    array('name' => 'quiz_id', 'in' => 'query', 'required' => false, 'type' => 'integer'),
                ),
                'response' => array(
                    'type' => 'array',
                    'items' => array(
                        'id' => 'integer',
                        'quizId' => 'integer',
                        'userId' => 'integer',
                        'nota' => 'integer (puntaje obtenido)',
                        'total' => 'integer (total de preguntas)',
                        'concluido' => 'boolean',
                        'createdAt' => 'string',
                        'updatedAt' => 'string',
                    ),
                ),
            ),
            array(
                'path' => '/quiz-responses',
                'method' => 'POST',
                'summary' => 'Registrar una respuesta de quiz',
                'tags' => array('Quiz Responses'),
                'permission' => 'academia_admin, academia_gestor, academia_atendente',
                'request_body' => array(
                    'required' => array('quizId', 'userId', 'nota', 'total'),
                    'optional' => array('concluido'),
                ),
            ),

            // PROGRESSO
            array(
                'path' => '/progresso',
                'method' => 'GET',
                'summary' => 'Obtener registros de progreso',
                'tags' => array('Progresso'),
                'permission' => 'academia_admin, academia_gestor, academia_atendente',
                'parameters' => array(
                    array('name' => 'user_id', 'in' => 'query', 'required' => false, 'type' => 'integer'),
                    array('name' => 'aula_id', 'in' => 'query', 'required' => false, 'type' => 'integer'),
                ),
                'response' => array(
                    'type' => 'array',
                    'items' => array(
                        'id' => 'integer',
                        'moduloId' => 'integer',
                        'aulaId' => 'integer',
                        'userId' => 'integer',
                        'concluido' => 'boolean',
                        'createdAt' => 'string',
                        'updatedAt' => 'string',
                    ),
                ),
            ),
            array(
                'path' => '/progresso',
                'method' => 'POST',
                'summary' => 'Crear registro de progreso',
                'tags' => array('Progresso'),
                'permission' => 'academia_admin, academia_gestor, academia_atendente',
                'request_body' => array(
                    'required' => array('moduloId', 'aulaId', 'userId'),
                    'optional' => array('concluido'),
                ),
            ),
            array(
                'path' => '/progresso/{id}',
                'method' => 'PUT',
                'summary' => 'Actualizar progreso',
                'tags' => array('Progresso'),
                'permission' => 'academia_admin, academia_gestor, academia_atendente',
                'parameters' => array(
                    array('name' => 'id', 'in' => 'path', 'required' => true, 'type' => 'integer'),
                ),
                'request_body' => array(
                    'optional' => array('concluido'),
                ),
            ),

            // CERTIFICADOS
            array(
                'path' => '/certificados',
                'method' => 'GET',
                'summary' => 'Listar certificados',
                'tags' => array('Certificados'),
                'permission' => 'academia_admin, academia_gestor, academia_atendente',
                'parameters' => array(
                    array('name' => 'user_id', 'in' => 'query', 'required' => false, 'type' => 'integer'),
                    array('name' => 'trilha_id', 'in' => 'query', 'required' => false, 'type' => 'integer'),
                ),
                'response' => array(
                    'type' => 'array',
                    'items' => array(
                        'id' => 'integer',
                        'userId' => 'integer',
                        'trilhaId' => 'integer',
                        'status' => 'string (pending|approved|issued)',
                        'pdfUrl' => 'string|null',
                        'aprovadoPor' => 'string|null',
                        'aprovadoEm' => 'string|null',
                        'createdAt' => 'string',
                        'updatedAt' => 'string',
                    ),
                ),
            ),
            array(
                'path' => '/certificados/{id}',
                'method' => 'GET',
                'summary' => 'Obtener un certificado por ID',
                'tags' => array('Certificados'),
                'permission' => 'academia_admin, academia_gestor, academia_atendente',
                'parameters' => array(
                    array('name' => 'id', 'in' => 'path', 'required' => true, 'type' => 'integer'),
                ),
            ),
            array(
                'path' => '/certificados',
                'method' => 'POST',
                'summary' => 'Crear un nuevo certificado',
                'tags' => array('Certificados'),
                'permission' => 'academia_admin, academia_gestor, academia_atendente',
                'request_body' => array(
                    'required' => array('userId', 'trilhaId'),
                    'optional' => array('status', 'pdfUrl'),
                ),
            ),
            array(
                'path' => '/certificados/{id}',
                'method' => 'PUT',
                'summary' => 'Actualizar un certificado (aprobar/emitir)',
                'tags' => array('Certificados'),
                'permission' => 'academia_admin',
                'parameters' => array(
                    array('name' => 'id', 'in' => 'path', 'required' => true, 'type' => 'integer'),
                ),
                'request_body' => array('optional' => array('status', 'pdfUrl', 'aprovadoPor', 'aprovadoEm')),
            ),

            // NOTIFICATIONS
            array(
                'path' => '/notifications',
                'method' => 'GET',
                'summary' => 'Listar notificaciones',
                'tags' => array('Notificaciones'),
                'permission' => 'academia_admin, academia_gestor, academia_atendente',
                'parameters' => array(
                    array('name' => 'to_id', 'in' => 'query', 'required' => false, 'type' => 'integer'),
                    array('name' => 'from_id', 'in' => 'query', 'required' => false, 'type' => 'integer'),
                ),
                'response' => array(
                    'type' => 'array',
                    'items' => array(
                        'id' => 'integer',
                        'fromId' => 'integer',
                        'toId' => 'integer',
                        'titulo' => 'string',
                        'mensagem' => 'string',
                        'lida' => 'boolean',
                        'createdAt' => 'string',
                    ),
                ),
            ),
            array(
                'path' => '/notifications',
                'method' => 'POST',
                'summary' => 'Enviar una notificacion',
                'tags' => array('Notificaciones'),
                'permission' => 'academia_admin, academia_gestor',
                'request_body' => array(
                    'required' => array('toId', 'titulo', 'mensagem'),
                ),
            ),
            array(
                'path' => '/notifications/{id}',
                'method' => 'PUT',
                'summary' => 'Actualizar notificacion (marcar como leida)',
                'tags' => array('Notificaciones'),
                'permission' => 'academia_admin, academia_gestor, academia_atendente',
                'parameters' => array(
                    array('name' => 'id', 'in' => 'path', 'required' => true, 'type' => 'integer'),
                ),
                'request_body' => array('optional' => array('lida')),
            ),

            // ACTIVITY LOGS
            array(
                'path' => '/activity-logs',
                'method' => 'GET',
                'summary' => 'Listar logs de actividad',
                'tags' => array('Activity Logs'),
                'permission' => 'academia_admin',
                'parameters' => array(
                    array('name' => 'user_id', 'in' => 'query', 'required' => false, 'type' => 'integer'),
                ),
            ),
            array(
                'path' => '/activity-logs',
                'method' => 'POST',
                'summary' => 'Crear un log de actividad',
                'tags' => array('Activity Logs'),
                'permission' => 'academia_admin, academia_gestor',
                'request_body' => array(
                    'required' => array('userId', 'acao'),
                    'optional' => array('detalhes'),
                ),
            ),

            // TRILHA ATENDENTE
            array(
                'path' => '/trilha-atendente',
                'method' => 'GET',
                'summary' => 'Listar asignaciones de trilhas a atendentes',
                'tags' => array('Trilha Atendente'),
                'permission' => 'academia_admin, academia_gestor',
                'parameters' => array(
                    array('name' => 'user_id', 'in' => 'query', 'required' => false, 'type' => 'integer'),
                    array('name' => 'trilha_id', 'in' => 'query', 'required' => false, 'type' => 'integer'),
                ),
            ),
            array(
                'path' => '/trilha-atendente',
                'method' => 'POST',
                'summary' => 'Asignar una trilha a un atendente',
                'tags' => array('Trilha Atendente'),
                'permission' => 'academia_admin, academia_gestor',
                'request_body' => array(
                    'required' => array('trilhaId', 'userId'),
                ),
            ),
            array(
                'path' => '/trilha-atendente/{id}',
                'method' => 'DELETE',
                'summary' => 'Eliminar asignacion de trilha',
                'tags' => array('Trilha Atendente'),
                'permission' => 'academia_admin',
                'parameters' => array(
                    array('name' => 'id', 'in' => 'path', 'required' => true, 'type' => 'integer'),
                ),
            ),
        ),
        'data_models' => array(
            'User' => array(
                'fields' => array(
                    'id' => 'integer (auto-increment)',
                    'email' => 'string (unique)',
                    'nome' => 'string',
                    'senha' => 'string (hashed with bcrypt)',
                    'role' => 'enum: ADMIN | GESTOR | ATENDENTE',
                    'gestorId' => 'integer|null (FK to User.id)',
                    'createdAt' => 'datetime',
                    'updatedAt' => 'datetime',
                    'lastLogin' => 'datetime|null',
                ),
            ),
            'Trilha' => array(
                'fields' => array(
                    'id' => 'integer (auto-increment)',
                    'titulo' => 'string',
                    'descricao' => 'text (HTML)',
                    'icon' => 'string (dashicons class)',
                    'color' => 'string (hex color)',
                    'obrigatorio' => 'boolean (default: false)',
                    'createdAt' => 'datetime',
                    'updatedAt' => 'datetime',
                ),
            ),
            'Modulo' => array(
                'fields' => array(
                    'id' => 'integer (auto-increment)',
                    'trilhaId' => 'integer (FK to Trilha.id)',
                    'titulo' => 'string',
                    'descricao' => 'text',
                    'ordem' => 'integer',
                    'videoUrl' => 'string|null (URL)',
                    'videoInicio' => 'integer|null (seconds)',
                    'videoFim' => 'integer|null (seconds)',
                    'createdAt' => 'datetime',
                    'updatedAt' => 'datetime',
                ),
            ),
            'Aula' => array(
                'fields' => array(
                    'id' => 'integer (auto-increment)',
                    'moduloId' => 'integer (FK to Modulo.id)',
                    'titulo' => 'string',
                    'descricao' => 'text',
                    'ordem' => 'integer',
                    'videoUrl' => 'string|null',
                    'videoInicio' => 'integer|null (seconds)',
                    'videoFim' => 'integer|null (seconds)',
                    'duracaoMin' => 'integer|null',
                    'createdAt' => 'datetime',
                    'updatedAt' => 'datetime',
                ),
            ),
            'Quiz' => array(
                'fields' => array(
                    'id' => 'integer (auto-increment)',
                    'aulaId' => 'integer (FK to Aula.id)',
                    'titulo' => 'string',
                    'autoGerarCertificado' => 'boolean',
                    'perguntas' => 'serialized array (QuizPergunta[])',
                    'createdAt' => 'datetime',
                    'updatedAt' => 'datetime',
                ),
            ),
            'QuizPergunta' => array(
                'fields' => array(
                    'pergunta' => 'string (question text)',
                    'opcao_a' => 'string',
                    'opcao_b' => 'string',
                    'opcao_c' => 'string|null',
                    'opcao_d' => 'string|null',
                    'correta' => 'string (A|B|C|D)',
                    'ordem' => 'integer',
                ),
            ),
            'QuizResponse' => array(
                'fields' => array(
                    'id' => 'integer (auto-increment)',
                    'quizId' => 'integer (FK to Quiz.id)',
                    'userId' => 'integer (FK to User.id)',
                    'nota' => 'integer (score)',
                    'total' => 'integer (total questions)',
                    'concluido' => 'boolean',
                    'createdAt' => 'datetime',
                    'updatedAt' => 'datetime',
                ),
            ),
            'Certificate' => array(
                'fields' => array(
                    'id' => 'integer (auto-increment)',
                    'userId' => 'integer (FK to User.id)',
                    'trilhaId' => 'integer (FK to Trilha.id)',
                    'status' => 'enum: pending | approved | issued',
                    'pdfUrl' => 'string|null',
                    'aprovadoPor' => 'string|null',
                    'aprovadoEm' => 'datetime|null',
                    'createdAt' => 'datetime',
                    'updatedAt' => 'datetime',
                ),
            ),
            'Notification' => array(
                'fields' => array(
                    'id' => 'integer (auto-increment)',
                    'fromId' => 'integer (FK to User.id)',
                    'toId' => 'integer (FK to User.id)',
                    'titulo' => 'string',
                    'mensagem' => 'text',
                    'lida' => 'boolean (default: false)',
                    'createdAt' => 'datetime',
                ),
            ),
            'ActivityLog' => array(
                'fields' => array(
                    'id' => 'integer (auto-increment)',
                    'userId' => 'integer (FK to User.id)',
                    'acao' => 'string (action performed)',
                    'detalhes' => 'text|null',
                    'createdAt' => 'datetime',
                ),
            ),
            'Progresso' => array(
                'fields' => array(
                    'id' => 'integer (auto-increment)',
                    'moduloId' => 'integer (FK to Modulo.id)',
                    'aulaId' => 'integer (FK to Aula.id)',
                    'userId' => 'integer (FK to User.id)',
                    'concluido' => 'boolean (default: false)',
                    'createdAt' => 'datetime',
                    'updatedAt' => 'datetime',
                ),
            ),
            'TrilhaAtendente' => array(
                'fields' => array(
                    'id' => 'integer (auto-increment)',
                    'trilhaId' => 'integer (FK to Trilha.id)',
                    'userId' => 'integer (FK to User.id)',
                    'createdAt' => 'datetime',
                ),
            ),
        ),
        'error_format' => array(
            'code' => 'string (error identifier)',
            'message' => 'string (human-readable error message)',
            'data' => 'object (additional context, optional)',
        ),
        'examples' => array(
            'list_trilhas' => array(
                'request' => 'GET /wp-json/academia-paygas/v1/trilhas',
                'response' => array(
                    array(
                        'id' => 1,
                        'titulo' => 'Excelencia en el Atendimento',
                        'descricao' => 'Aprenda las mejores practicas...',
                        'icon' => 'dashicons-book-alt',
                        'color' => '#3b82f6',
                        'obrigatorio' => true,
                        'createdAt' => '2026-01-15T10:30:00',
                        'updatedAt' => '2026-01-15T10:30:00',
                    ),
                ),
            ),
            'create_user' => array(
                'request' => 'POST /wp-json/academia-paygas/v1/users',
                'body' => array(
                    'email' => 'usuario@ejemplo.com',
                    'nome' => 'Juan Perez',
                    'senha' => 'password123',
                    'role' => 'academia_atendente',
                ),
            ),
        ),
    );
}

function academia_paygas_docs_handler($request) {
    $format = $request->get_param('format');
    if ($format === 'html') {
        return academia_paygas_docs_html_handler($request);
    }
    return academia_paygas_docs_json_handler($request);
}

function academia_paygas_docs_json_handler($request) {
    $spec = academia_paygas_get_api_spec();
    $response = rest_ensure_response($spec);
    $response->header('Content-Type', 'application/json; charset=utf-8');
    $response->header('X-API-Version', '1.0.0');
    $response->header('X-Documentation-Type', 'openapi-spec');
    return $response;
}

function academia_paygas_docs_html_handler($request) {
    $spec = academia_paygas_get_api_spec();
    $json = wp_json_encode($spec, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

    $html = '<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Academia PayGas - API Documentation</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; }
.container { max-width: 1100px; margin: 0 auto; padding: 20px; }
header { background: linear-gradient(135deg, #1e3a5f, #2563eb); color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; }
header h1 { font-size: 28px; margin-bottom: 8px; }
header p { opacity: 0.9; font-size: 14px; }
.badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 3px 10px; border-radius: 12px; font-size: 12px; margin-top: 10px; }
nav { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
nav h2 { font-size: 16px; margin-bottom: 12px; color: #1e3a5f; }
nav ul { list-style: none; display: flex; flex-wrap: wrap; gap: 6px; }
nav a { display: inline-block; padding: 4px 12px; background: #e8f0fe; color: #1a73e8; border-radius: 16px; text-decoration: none; font-size: 13px; }
nav a:hover { background: #1a73e8; color: white; }
.section { background: white; border-radius: 8px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.section h2 { font-size: 20px; color: #1e3a5f; margin-bottom: 16px; border-bottom: 2px solid #e8f0fe; padding-bottom: 8px; }
.endpoint { border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 12px; overflow: hidden; }
.endpoint-header { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: #f8f9fa; cursor: pointer; }
.endpoint-header:hover { background: #e8f0fe; }
.method { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 12px; color: white; min-width: 60px; text-align: center; }
.method-GET { background: #34a853; }
.method-POST { background: #4285f4; }
.method-PUT { background: #fbbc04; color: #333; }
.method-DELETE { background: #ea4335; }
.path { font-family: monospace; font-size: 14px; font-weight: 600; }
.summary { font-size: 13px; color: #666; margin-left: auto; }
.endpoint-body { padding: 14px; border-top: 1px solid #e0e0e0; display: none; }
.endpoint-body.open { display: block; }
.endpoint-body h4 { font-size: 13px; color: #555; margin: 10px 0 6px; }
.param-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.param-table th { text-align: left; padding: 6px 8px; background: #f0f0f0; border-bottom: 1px solid #ddd; }
.param-table td { padding: 6px 8px; border-bottom: 1px solid #eee; }
code { background: #f0f0f0; padding: 2px 5px; border-radius: 3px; font-size: 12px; }
pre { background: #1e1e1e; color: #d4d4d4; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; margin: 8px 0; }
pre .key { color: #9cdcfe; }
pre .string { color: #ce9178; }
pre .number { color: #b5cea8; }
pre .boolean { color: #569cd6; }
.model-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 10px; }
.model-table th { text-align: left; padding: 8px; background: #f0f0f0; border: 1px solid #ddd; }
.model-table td { padding: 8px; border: 1px solid #eee; }
.tag { display: inline-block; padding: 2px 8px; background: #e8f0fe; color: #1a73e8; border-radius: 4px; font-size: 11px; margin-right: 4px; }
.json-toggle { display: inline-block; margin-top: 10px; padding: 6px 14px; background: #1e3a5f; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; }
.json-toggle:hover { background: #2563eb; }
.json-view { margin-top: 10px; }
footer { text-align: center; padding: 20px; font-size: 12px; color: #999; }
</style>
</head>
<body>
<div class="container">
<header>
<h1>Academia PayGas - REST API</h1>
<p>API completa para el sistema de aprendizaje. Documentacion estructurada para agentes IA y desarrolladores.</p>
<span class="badge">v1.0.0</span> <span class="badge">OpenAPI 3.1</span> <span class="badge">WordPress Plugin</span>
</header>

<nav>
<h2>Tags</h2>
<ul>
<li><a href="#tag-Users">Users</a></li>
<li><a href="#tag-Trilhas">Trilhas</a></li>
<li><a href="#tag-Modulos">Modulos</a></li>
<li><a href="#tag-Aulas">Aulas</a></li>
<li><a href="#tag-Quizzes">Quizzes</a></li>
<li><a href="#tag-Quiz-Responses">Quiz Responses</a></li>
<li><a href="#tag-Progresso">Progresso</a></li>
<li><a href="#tag-Certificados">Certificados</a></li>
<li><a href="#tag-Notificaciones">Notificaciones</a></li>
<li><a href="#tag-Activity-Logs">Activity Logs</a></li>
<li><a href="#tag-Trilha-Atendente">Trilha Atendente</a></li>
<li><a href="#tag-Models">Data Models</a></li>
<li><a href="#tag-JSON">JSON Spec</a></li>
</ul>
</nav>';

    // Authentication section
    $html .= '<div class="section">
<h2>Authentication</h2>
<p><strong>Tipo:</strong> WordPress Cookie / Application Passwords</p>
<p><strong>Requisito:</strong> Todos los endpoints requieren permiso <code>read</code> como minimo. Los endpoints de escritura requieren roles especificos.</p>
<h3>Roles</h3>
<table class="model-table">
<tr><th>Rol</th><th>Descripcion</th><th>Permisos</th></tr>
<tr><td><code>academia_admin</code></td><td>Admin PayGas - Acceso completo</td><td>read, edit_posts, delete_posts, publish_posts, upload_files, manage_categories, manage_options</td></tr>
<tr><td><code>academia_gestor</code></td><td>Gestor de Posto - Acceso limitado</td><td>read, edit_posts, upload_files</td></tr>
<tr><td><code>academia_atendente</code></td><td>Atendente - Solo lectura</td><td>read</td></tr>
</table>
</div>';

    // Endpoints by tag
    $tags = array();
    foreach ($spec['endpoints'] as $ep) {
        foreach ($ep['tags'] as $tag) {
            $tags[$tag][] = $ep;
        }
    }

    foreach ($tags as $tag => $endpoints) {
        $html .= '<div class="section" id="tag-' . str_replace(' ', '-', $tag) . '">';
        $html .= '<h2>' . esc_html($tag) . '</h2>';
        foreach ($endpoints as $ep) {
            $methodClass = 'method-' . $ep['method'];
            $html .= '<div class="endpoint">';
            $html .= '<div class="endpoint-header" onclick="this.nextElementSibling.classList.toggle(\'open\')">';
            $html .= '<span class="method ' . $methodClass . '">' . $ep['method'] . '</span>';
            $html .= '<span class="path">' . esc_html($ep['path']) . '</span>';
            $html .= '<span class="summary">' . esc_html($ep['summary']) . '</span>';
            $html .= '</div>';
            $html .= '<div class="endpoint-body">';

            if (!empty($ep['description'])) {
                $html .= '<p>' . esc_html($ep['description']) . '</p>';
            }
            $html .= '<p><strong>Permiso:</strong> <code>' . esc_html($ep['permission']) . '</code></p>';

            if (!empty($ep['parameters'])) {
                $html .= '<h4>Parametros</h4>';
                $html .= '<table class="param-table"><tr><th>Nombre</th><th>In</th><th>Requerido</th><th>Tipo</th><th>Descripcion</th></tr>';
                foreach ($ep['parameters'] as $p) {
                    $html .= '<tr><td><code>' . esc_html($p['name']) . '</code></td>';
                    $html .= '<td>' . esc_html($p['in']) . '</td>';
                    $html .= '<td>' . ($p['required'] ? 'Si' : 'No') . '</td>';
                    $html .= '<td><code>' . esc_html($p['type']) . '</code></td>';
                    $html .= '<td>' . esc_html($p['description'] ?? '') . '</td></tr>';
                }
                $html .= '</table>';
            }

            if (!empty($ep['request_body'])) {
                $html .= '<h4>Request Body (JSON)</h4>';
                $html .= '<pre>' . esc_html(wp_json_encode($ep['request_body'], JSON_PRETTY_PRINT)) . '</pre>';
            }

            if (!empty($ep['response'])) {
                $html .= '<h4>Response</h4>';
                $html .= '<pre>' . esc_html(wp_json_encode($ep['response'], JSON_PRETTY_PRINT)) . '</pre>';
            }

            $html .= '</div></div>';
        }
        $html .= '</div>';
    }

    // Data Models
    $html .= '<div class="section" id="tag-Models"><h2>Data Models</h2>';
    foreach ($spec['data_models'] as $modelName => $model) {
        $html .= '<h3>' . esc_html($modelName) . '</h3>';
        $html .= '<table class="model-table"><tr><th>Campo</th><th>Tipo</th></tr>';
        foreach ($model['fields'] as $field => $type) {
            $html .= '<tr><td><code>' . esc_html($field) . '</code></td><td>' . esc_html($type) . '</td></tr>';
        }
        $html .= '</table>';
    }
    $html .= '</div>';

    // JSON spec
    $html .= '<div class="section" id="tag-JSON">';
    $html .= '<h2>JSON Specification (for AI Agents)</h2>';
    $html .= '<p>Esta especificacion JSON esta optimizada para ser consumida por agentes IA. Accede directamente via:</p>';
    $html .= '<pre>GET /wp-json/academia-paygas/v1/docs/json</pre>';
    $html .= '<button class="json-toggle" onclick="document.getElementById(\'json-spec\').style.display=document.getElementById(\'json-spec\').style.display===\'none\'?\'block\':\'none\'">Toggle JSON</button>';
    $html .= '<div class="json-view" id="json-spec" style="display:none"><pre>' . esc_html($json) . '</pre></div>';
    $html .= '</div>';

    $html .= '<footer>Academia PayGas REST API Documentation v1.0.0 | Generado automaticamente</footer>';
    $html .= '</div></body></html>';

    $response = rest_ensure_response($html);
    $response->header('Content-Type', 'text/html; charset=utf-8');
    return $response;
}
