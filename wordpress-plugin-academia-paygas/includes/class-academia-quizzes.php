<?php
if (!defined('ABSPATH')) exit;

class Academia_Quizzes {

    private Academia_Auth $auth;

    public function __construct(Academia_Auth $auth) {
        $this->auth = $auth;
    }

    public function register_routes(): void {
        $ns = ACADEMIA_PAYGAS_NAMESPACE;

        register_rest_route($ns, '/quizzes', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [$this, 'get_quizzes'],
            'permission_callback' => $this->auth->permission_callback(),
            'args'                => $this->collection_params(),
        ]);

        register_rest_route($ns, '/quizzes/(?P<id>\d+)', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [$this, 'get_quiz'],
            'permission_callback' => $this->auth->permission_callback(),
        ]);

        register_rest_route($ns, '/quizzes', [
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => [$this, 'create_quiz'],
            'permission_callback' => $this->auth->permission_callback(),
            'args'                => $this->create_params(),
        ]);

        register_rest_route($ns, '/quizzes/(?P<id>\d+)', [
            'methods'             => WP_REST_Server::EDITABLE,
            'callback'            => [$this, 'update_quiz'],
            'permission_callback' => $this->auth->permission_callback(),
        ]);

        register_rest_route($ns, '/quizzes/(?P<id>\d+)', [
            'methods'             => WP_REST_Server::DELETABLE,
            'callback'            => [$this, 'delete_quiz'],
            'permission_callback' => $this->auth->permission_callback(),
        ]);

        // Quiz Responses
        register_rest_route($ns, '/quiz-responses', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [$this, 'get_quiz_responses'],
            'permission_callback' => $this->auth->permission_callback(),
            'args'                => $this->response_params(),
        ]);

        register_rest_route($ns, '/quiz-responses', [
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => [$this, 'create_quiz_response'],
            'permission_callback' => $this->auth->permission_callback(),
        ]);
    }

    // --- Quiz CRUD ---

    public function get_quizzes(WP_REST_Request $request): WP_REST_Response {
        $page     = (int) $request->get_param('page') ?: 1;
        $per_page = min((int) $request->get_param('per_page') ?: 20, 100);
        $aula_id  = (int) $request->get_param('aula_id');

        $args = [
            'post_type'      => 'ap_quiz',
            'posts_per_page' => $per_page,
            'paged'          => $page,
            'post_status'    => 'publish',
            'meta_query'     => [],
        ];

        if ($aula_id) {
            $args['meta_query'][] = [
                'key'   => '_ap_quiz_aula_id',
                'value' => $aula_id,
            ];
        }

        $query = new WP_Query($args);
        $total = $query->found_posts;
        $data  = array_map([$this, 'format_quiz'], $query->posts);

        wp_reset_postdata();

        return new WP_REST_Response([
            'data'       => $data,
            'pagination' => [
                'total'       => $total,
                'total_pages' => (int) ceil($total / $per_page),
                'page'        => $page,
                'per_page'    => $per_page,
            ],
        ], 200);
    }

    public function get_quiz(WP_REST_Request $request): WP_REST_Response {
        $post = get_post($request['id']);

        if (!$post || $post->post_type !== 'ap_quiz') {
            return new WP_Error('quiz_not_found', 'Quiz no encontrado', ['status' => 404]);
        }

        return new WP_REST_Response($this->format_quiz($post), 200);
    }

    public function create_quiz(WP_REST_Request $request): WP_REST_Response {
        $params = $request->get_json_params();

        $post_id = wp_insert_post([
            'post_title'  => sanitize_text_field($params['titulo']),
            'post_type'   => 'ap_quiz',
            'post_status' => 'publish',
        ]);

        if (is_wp_error($post_id)) {
            return $post_id;
        }

        $this->save_post_meta($post_id, $params);

        return new WP_REST_Response($this->format_quiz(get_post($post_id)), 201);
    }

    public function update_quiz(WP_REST_Request $request): WP_REST_Response {
        $post = get_post($request['id']);

        if (!$post || $post->post_type !== 'ap_quiz') {
            return new WP_Error('quiz_not_found', 'Quiz no encontrado', ['status' => 404]);
        }

        $params = $request->get_json_params();

        if (isset($params['titulo'])) {
            wp_update_post(['ID' => $post->ID, 'post_title' => sanitize_text_field($params['titulo'])]);
        }

        $this->save_post_meta($post->ID, $params);

        return new WP_REST_Response($this->format_quiz(get_post($post->ID)), 200);
    }

    public function delete_quiz(WP_REST_Request $request): WP_REST_Response {
        if (wp_delete_post($request['id'], true)) {
            return new WP_REST_Response(['message' => 'Quiz eliminado'], 200);
        }
        return new WP_Error('delete_failed', 'Error al eliminar quiz', ['status' => 500]);
    }

    // --- Quiz Responses ---

    public function get_quiz_responses(WP_REST_Request $request): WP_REST_Response {
        $user_id = (int) $request->get_param('user_id');
        $quiz_id = (int) $request->get_param('quiz_id');

        $args = [
            'post_type'      => 'ap_quiz_response',
            'posts_per_page' => -1,
            'meta_query'     => [],
        ];

        if ($user_id) $args['meta_query'][] = ['key' => '_ap_quiz_response_user_id', 'value' => $user_id];
        if ($quiz_id) $args['meta_query'][] = ['key' => '_ap_quiz_response_quiz_id', 'value' => $quiz_id];

        $posts = get_posts($args);
        $data  = array_map([$this, 'format_response'], $posts);

        return new WP_REST_Response($data, 200);
    }

    public function create_quiz_response(WP_REST_Request $request): WP_REST_Response {
        $params = $request->get_json_params();

        $post_id = wp_insert_post([
            'post_title'  => 'Quiz Response - ' . intval($params['userId']),
            'post_type'   => 'ap_quiz_response',
            'post_status' => 'publish',
        ]);

        if (is_wp_error($post_id)) {
            return $post_id;
        }

        update_post_meta($post_id, '_ap_quiz_response_quiz_id', intval($params['quizId']));
        update_post_meta($post_id, '_ap_quiz_response_user_id', intval($params['userId']));
        update_post_meta($post_id, '_ap_quiz_response_nota', intval($params['nota']));
        update_post_meta($post_id, '_ap_quiz_response_total', intval($params['total']));
        update_post_meta($post_id, '_ap_quiz_response_concluido', !empty($params['concluido']) ? '1' : '0');

        return new WP_REST_Response([
            'id'        => $post_id,
            'quizId'    => intval($params['quizId']),
            'userId'    => intval($params['userId']),
            'nota'      => intval($params['nota']),
            'total'     => intval($params['total']),
            'concluido' => !empty($params['concluido']),
            'createdAt' => current_time('mysql'),
        ], 201);
    }

    private function save_post_meta(int $post_id, array $params): void {
        if (isset($params['aulaId'])) {
            update_post_meta($post_id, '_ap_quiz_aula_id', intval($params['aulaId']));
        }
        if (isset($params['autoGerarCertificado'])) {
            update_post_meta($post_id, '_ap_quiz_auto_gerar_certificado', $params['autoGerarCertificado'] ? '1' : '0');
        }
        if (isset($params['perguntas']) && is_array($params['perguntas'])) {
            update_post_meta($post_id, '_ap_quiz_perguntas', $params['perguntas']);
        }
    }

    private function format_quiz(WP_Post $post): array {
        return [
            'id'                     => $post->ID,
            'aulaId'                 => get_post_meta($post->ID, '_ap_quiz_aula_id', true) ?: null,
            'titulo'                 => $post->post_title,
            'autoGerarCertificado'   => get_post_meta($post->ID, '_ap_quiz_auto_gerar_certificado', true) === '1',
            'perguntas'              => get_post_meta($post->ID, '_ap_quiz_perguntas', true) ?: [],
            'createdAt'              => $post->post_date,
            'updatedAt'              => $post->post_modified,
        ];
    }

    private function format_response(WP_Post $post): array {
        return [
            'id'        => $post->ID,
            'quizId'    => get_post_meta($post->ID, '_ap_quiz_response_quiz_id', true),
            'userId'    => get_post_meta($post->ID, '_ap_quiz_response_user_id', true),
            'nota'      => (int) get_post_meta($post->ID, '_ap_quiz_response_nota', true),
            'total'     => (int) get_post_meta($post->ID, '_ap_quiz_response_total', true),
            'concluido' => get_post_meta($post->ID, '_ap_quiz_response_concluido', true) === '1',
            'createdAt' => $post->post_date,
            'updatedAt' => $post->post_modified,
        ];
    }

    private function collection_params(): array {
        return [
            'page'     => ['default' => 1, 'sanitize_callback' => 'absint'],
            'per_page' => ['default' => 20, 'sanitize_callback' => 'absint'],
            'aula_id'  => ['default' => 0, 'sanitize_callback' => 'absint'],
        ];
    }

    private function create_params(): array {
        return [
            'titulo'                  => ['required' => true, 'sanitize_callback' => 'sanitize_text_field'],
            'aulaId'                  => ['required' => false, 'sanitize_callback' => 'absint'],
            'autoGerarCertificado'    => ['required' => false],
            'perguntas'               => ['required' => false],
        ];
    }

    private function response_params(): array {
        return [
            'user_id' => ['default' => 0, 'sanitize_callback' => 'absint'],
            'quiz_id' => ['default' => 0, 'sanitize_callback' => 'absint'],
        ];
    }
}
