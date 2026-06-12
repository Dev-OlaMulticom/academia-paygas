<?php
if (!defined('ABSPATH')) exit;

class Academia_Notifications {

    private Academia_Auth $auth;

    public function __construct(Academia_Auth $auth) {
        $this->auth = $auth;
    }

    public function register_routes(): void {
        $ns = 'academia-paygas/v1';

        register_rest_route($ns, '/notifications', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [$this, 'get_notifications'],
            'permission_callback' => $this->auth->permission_callback(),
            'args'                => $this->collection_params(),
        ]);

        register_rest_route($ns, '/notifications', [
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => [$this, 'create_notification'],
            'permission_callback' => $this->auth->permission_callback(),
        ]);

        register_rest_route($ns, '/notifications/(?P<id>\d+)', [
            'methods'             => WP_REST_Server::EDITABLE,
            'callback'            => [$this, 'update_notification'],
            'permission_callback' => $this->auth->permission_callback(),
        ]);

        // Activity Logs
        register_rest_route($ns, '/activity-logs', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [$this, 'get_activity_logs'],
            'permission_callback' => $this->auth->permission_callback(),
        ]);

        register_rest_route($ns, '/activity-logs', [
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => [$this, 'create_activity_log'],
            'permission_callback' => $this->auth->permission_callback(),
        ]);

        // Trilha Atendente
        register_rest_route($ns, '/trilha-atendente', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [$this, 'get_trilha_atendente'],
            'permission_callback' => $this->auth->permission_callback(),
        ]);

        register_rest_route($ns, '/trilha-atendente', [
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => [$this, 'create_trilha_atendente'],
            'permission_callback' => $this->auth->permission_callback(),
        ]);

        register_rest_route($ns, '/trilha-atendente/(?P<id>\d+)', [
            'methods'             => WP_REST_Server::DELETABLE,
            'callback'            => [$this, 'delete_trilha_atendente'],
            'permission_callback' => $this->auth->permission_callback(),
        ]);

        // Progresso
        register_rest_route($ns, '/progresso', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [$this, 'get_progresso'],
            'permission_callback' => $this->auth->permission_callback(),
        ]);

        register_rest_route($ns, '/progresso', [
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => [$this, 'create_progresso'],
            'permission_callback' => $this->auth->permission_callback(),
        ]);

        register_rest_route($ns, '/progresso/(?P<id>\d+)', [
            'methods'             => WP_REST_Server::EDITABLE,
            'callback'            => [$this, 'update_progresso'],
            'permission_callback' => $this->auth->permission_callback(),
        ]);
    }

    // --- Notifications ---

    public function get_notifications(WP_REST_Request $request): WP_REST_Response {
        $to_id   = (int) $request->get_param('to_id');
        $from_id = (int) $request->get_param('from_id');

        $args = [
            'post_type'      => 'ap_notification',
            'posts_per_page' => -1,
            'meta_query'     => [],
        ];

        if ($to_id)   $args['meta_query'][] = ['key' => '_ap_notification_to_id', 'value' => $to_id];
        if ($from_id) $args['meta_query'][] = ['key' => '_ap_notification_from_id', 'value' => $from_id];

        $posts = get_posts($args);
        $data  = array_map([$this, 'format_notification'], $posts);

        return new WP_REST_Response($data, 200);
    }

    public function create_notification(WP_REST_Request $request): WP_REST_Response {
        $params = $request->get_json_params();

        $post_id = wp_insert_post([
            'post_title'  => sanitize_text_field($params['titulo']),
            'post_content' => wp_kses_post($params['mensagem']),
            'post_type'   => 'ap_notification',
            'post_status' => 'publish',
        ]);

        if (is_wp_error($post_id)) {
            return $post_id;
        }

        update_post_meta($post_id, '_ap_notification_to_id', intval($params['toId']));
        update_post_meta($post_id, '_ap_notification_from_id', intval($params['fromId'] ?? get_current_user_id()));
        update_post_meta($post_id, '_ap_notification_lida', '0');

        return new WP_REST_Response($this->format_notification(get_post($post_id)), 201);
    }

    public function update_notification(WP_REST_Request $request): WP_REST_Response {
        $post = get_post($request['id']);

        if (!$post || $post->post_type !== 'ap_notification') {
            return new WP_Error('not_found', 'Notificacion no encontrada', ['status' => 404]);
        }

        $params = $request->get_json_params();

        if (isset($params['lida'])) {
            update_post_meta($post->ID, '_ap_notification_lida', $params['lida'] ? '1' : '0');
        }

        return new WP_REST_Response($this->format_notification(get_post($post->ID)), 200);
    }

    private function format_notification(WP_Post $post): array {
        return [
            'id'        => $post->ID,
            'fromId'    => (int) get_post_meta($post->ID, '_ap_notification_from_id', true),
            'toId'      => (int) get_post_meta($post->ID, '_ap_notification_to_id', true),
            'titulo'    => $post->post_title,
            'mensagem'  => $post->post_content,
            'lida'      => get_post_meta($post->ID, '_ap_notification_lida', true) === '1',
            'createdAt' => $post->post_date,
        ];
    }

    // --- Activity Logs ---

    public function get_activity_logs(WP_REST_Request $request): WP_REST_Response {
        $user_id = (int) $request->get_param('user_id');

        $args = [
            'post_type'      => 'ap_activity_log',
            'posts_per_page' => -1,
        ];

        if ($user_id) {
            $args['meta_query'] = [['key' => '_ap_activity_log_user_id', 'value' => $user_id]];
        }

        $posts = get_posts($args);
        $data  = array_map(function ($post) {
            return [
                'id'        => $post->ID,
                'userId'    => (int) get_post_meta($post->ID, '_ap_activity_log_user_id', true),
                'acao'      => get_post_meta($post->ID, '_ap_activity_log_acao', true),
                'detalhes'  => get_post_meta($post->ID, '_ap_activity_log_detalhes', true) ?: null,
                'createdAt' => $post->post_date,
            ];
        }, $posts);

        return new WP_REST_Response($data, 200);
    }

    public function create_activity_log(WP_REST_Request $request): WP_REST_Response {
        $params = $request->get_json_params();

        $post_id = wp_insert_post([
            'post_title'  => 'Activity - ' . intval($params['userId']),
            'post_type'   => 'ap_activity_log',
            'post_status' => 'publish',
        ]);

        if (is_wp_error($post_id)) {
            return $post_id;
        }

        update_post_meta($post_id, '_ap_activity_log_user_id', intval($params['userId']));
        update_post_meta($post_id, '_ap_activity_log_acao', sanitize_text_field($params['acao']));

        if (isset($params['detalhes'])) {
            update_post_meta($post_id, '_ap_activity_log_detalhes', sanitize_textarea_field($params['detalhes']));
        }

        return new WP_REST_Response(['id' => $post_id, 'message' => 'Log creado'], 201);
    }

    // --- Trilha Atendente ---

    public function get_trilha_atendente(WP_REST_Request $request): WP_REST_Response {
        $user_id   = (int) $request->get_param('user_id');
        $trilha_id = (int) $request->get_param('trilha_id');

        $args = [
            'post_type'      => 'ap_trilha_atendente',
            'posts_per_page' => -1,
            'meta_query'     => [],
        ];

        if ($user_id)   $args['meta_query'][] = ['key' => '_ap_ta_user_id', 'value' => $user_id];
        if ($trilha_id) $args['meta_query'][] = ['key' => '_ap_ta_trilha_id', 'value' => $trilha_id];

        $posts = get_posts($args);
        $data  = array_map(function ($post) {
            return [
                'id'        => $post->ID,
                'trilhaId'  => (int) get_post_meta($post->ID, '_ap_ta_trilha_id', true),
                'userId'    => (int) get_post_meta($post->ID, '_ap_ta_user_id', true),
                'createdAt' => $post->post_date,
            ];
        }, $posts);

        return new WP_REST_Response($data, 200);
    }

    public function create_trilha_atendente(WP_REST_Request $request): WP_REST_Response {
        $params = $request->get_json_params();

        $post_id = wp_insert_post([
            'post_title'  => 'Trilha Atendente',
            'post_type'   => 'ap_trilha_atendente',
            'post_status' => 'publish',
        ]);

        if (is_wp_error($post_id)) {
            return $post_id;
        }

        update_post_meta($post_id, '_ap_ta_trilha_id', intval($params['trilhaId']));
        update_post_meta($post_id, '_ap_ta_user_id', intval($params['userId']));

        return new WP_REST_Response([
            'id'        => $post_id,
            'trilhaId'  => intval($params['trilhaId']),
            'userId'    => intval($params['userId']),
            'createdAt' => current_time('mysql'),
        ], 201);
    }

    public function delete_trilha_atendente(WP_REST_Request $request): WP_REST_Response {
        if (wp_delete_post($request['id'], true)) {
            return new WP_REST_Response(['message' => 'Asignacion eliminada'], 200);
        }
        return new WP_Error('delete_failed', 'Error al eliminar', ['status' => 500]);
    }

    // --- Progresso ---

    public function get_progresso(WP_REST_Request $request): WP_REST_Response {
        $user_id = (int) $request->get_param('user_id');
        $aula_id = (int) $request->get_param('aula_id');

        $args = [
            'post_type'      => 'ap_progresso',
            'posts_per_page' => -1,
            'meta_query'     => [],
        ];

        if ($user_id) $args['meta_query'][] = ['key' => '_ap_progresso_user_id', 'value' => $user_id];
        if ($aula_id) $args['meta_query'][] = ['key' => '_ap_progresso_aula_id', 'value' => $aula_id];

        $posts = get_posts($args);
        $data  = array_map(function ($post) {
            return [
                'id'        => $post->ID,
                'moduloId'  => (int) get_post_meta($post->ID, '_ap_progresso_modulo_id', true),
                'aulaId'    => (int) get_post_meta($post->ID, '_ap_progresso_aula_id', true),
                'userId'    => (int) get_post_meta($post->ID, '_ap_progresso_user_id', true),
                'concluido' => get_post_meta($post->ID, '_ap_progresso_concluido', true) === '1',
                'createdAt' => $post->post_date,
                'updatedAt' => $post->post_modified,
            ];
        }, $posts);

        return new WP_REST_Response($data, 200);
    }

    public function create_progresso(WP_REST_Request $request): WP_REST_Response {
        $params = $request->get_json_params();

        $post_id = wp_insert_post([
            'post_title'  => 'Progresso - ' . intval($params['userId']),
            'post_type'   => 'ap_progresso',
            'post_status' => 'publish',
        ]);

        if (is_wp_error($post_id)) {
            return $post_id;
        }

        update_post_meta($post_id, '_ap_progresso_modulo_id', intval($params['moduloId']));
        update_post_meta($post_id, '_ap_progresso_aula_id', intval($params['aulaId']));
        update_post_meta($post_id, '_ap_progresso_user_id', intval($params['userId']));
        update_post_meta($post_id, '_ap_progresso_concluido', !empty($params['concluido']) ? '1' : '0');

        return new WP_REST_Response([
            'id'        => $post_id,
            'moduloId'  => intval($params['moduloId']),
            'aulaId'    => intval($params['aulaId']),
            'userId'    => intval($params['userId']),
            'concluido' => !empty($params['concluido']),
            'createdAt' => current_time('mysql'),
        ], 201);
    }

    public function update_progresso(WP_REST_Request $request): WP_REST_Response {
        $post = get_post($request['id']);

        if (!$post || $post->post_type !== 'ap_progresso') {
            return new WP_Error('not_found', 'Progreso no encontrado', ['status' => 404]);
        }

        $params = $request->get_json_params();

        if (isset($params['concluido'])) {
            update_post_meta($post->ID, '_ap_progresso_concluido', $params['concluido'] ? '1' : '0');
        }

        return new WP_REST_Response([
            'id'        => $post->ID,
            'moduloId'  => (int) get_post_meta($post->ID, '_ap_progresso_modulo_id', true),
            'aulaId'    => (int) get_post_meta($post->ID, '_ap_progresso_aula_id', true),
            'userId'    => (int) get_post_meta($post->ID, '_ap_progresso_user_id', true),
            'concluido' => get_post_meta($post->ID, '_ap_progresso_concluido', true) === '1',
            'updatedAt' => current_time('mysql'),
        ], 200);
    }

    private function collection_params(): array {
        return [
            'to_id'   => ['default' => 0, 'sanitize_callback' => 'absint'],
            'from_id' => ['default' => 0, 'sanitize_callback' => 'absint'],
        ];
    }
}
