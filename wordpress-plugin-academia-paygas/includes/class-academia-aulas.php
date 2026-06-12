<?php
if (!defined('ABSPATH')) exit;

class Academia_Aulas {

    private Academia_Auth $auth;

    public function __construct(Academia_Auth $auth) {
        $this->auth = $auth;
    }

    public function register_routes(): void {
        $ns = 'academia-paygas/v1';

        register_rest_route($ns, '/aulas', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [$this, 'get_aulas'],
            'permission_callback' => $this->auth->permission_callback(),
            'args'                => $this->collection_params(),
        ]);

        register_rest_route($ns, '/aulas/(?P<id>\d+)', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [$this, 'get_aula'],
            'permission_callback' => $this->auth->permission_callback(),
        ]);

        register_rest_route($ns, '/aulas', [
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => [$this, 'create_aula'],
            'permission_callback' => $this->auth->permission_callback(),
            'args'                => $this->create_params(),
        ]);

        register_rest_route($ns, '/aulas/(?P<id>\d+)', [
            'methods'             => WP_REST_Server::EDITABLE,
            'callback'            => [$this, 'update_aula'],
            'permission_callback' => $this->auth->permission_callback(),
        ]);

        register_rest_route($ns, '/aulas/(?P<id>\d+)', [
            'methods'             => WP_REST_Server::DELETABLE,
            'callback'            => [$this, 'delete_aula'],
            'permission_callback' => $this->auth->permission_callback(),
        ]);
    }

    public function get_aulas(WP_REST_Request $request): WP_REST_Response {
        $page      = (int) $request->get_param('page') ?: 1;
        $per_page  = min((int) $request->get_param('per_page') ?: 20, 100);
        $modulo_id = (int) $request->get_param('modulo_id');

        $args = [
            'post_type'      => 'ap_aula',
            'posts_per_page' => $per_page,
            'paged'          => $page,
            'post_status'    => 'publish',
            'meta_query'     => [],
        ];

        if ($modulo_id) {
            $args['meta_query'][] = [
                'key'   => '_ap_aula_modulo_id',
                'value' => $modulo_id,
            ];
        }

        $query = new WP_Query($args);
        $total = $query->found_posts;
        $data  = array_map([$this, 'format_aula'], $query->posts);

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

    public function get_aula(WP_REST_Request $request): WP_REST_Response {
        $post = get_post($request['id']);

        if (!$post || $post->post_type !== 'ap_aula') {
            return new WP_Error('aula_not_found', 'Aula no encontrada', ['status' => 404]);
        }

        return new WP_REST_Response($this->format_aula($post), 200);
    }

    public function create_aula(WP_REST_Request $request): WP_REST_Response {
        $params = $request->get_json_params();

        $post_id = wp_insert_post([
            'post_title'   => sanitize_text_field($params['titulo']),
            'post_content' => wp_kses_post($params['descricao'] ?? ''),
            'post_type'    => 'ap_aula',
            'post_status'  => 'publish',
        ]);

        if (is_wp_error($post_id)) {
            return $post_id;
        }

        $this->save_post_meta($post_id, $params);

        return new WP_REST_Response($this->format_aula(get_post($post_id)), 201);
    }

    public function update_aula(WP_REST_Request $request): WP_REST_Response {
        $post = get_post($request['id']);

        if (!$post || $post->post_type !== 'ap_aula') {
            return new WP_Error('aula_not_found', 'Aula no encontrada', ['status' => 404]);
        }

        $params = $request->get_json_params();
        $args   = ['ID' => $post->ID];

        if (isset($params['titulo']))    $args['post_title']   = sanitize_text_field($params['titulo']);
        if (isset($params['descricao'])) $args['post_content'] = wp_kses_post($params['descricao']);

        wp_update_post($args);
        $this->save_post_meta($post->ID, $params);

        return new WP_REST_Response($this->format_aula(get_post($post->ID)), 200);
    }

    public function delete_aula(WP_REST_Request $request): WP_REST_Response {
        if (wp_delete_post($request['id'], true)) {
            return new WP_REST_Response(['message' => 'Aula eliminada'], 200);
        }
        return new WP_Error('delete_failed', 'Error al eliminar aula', ['status' => 500]);
    }

    private function save_post_meta(int $post_id, array $params): void {
        if (isset($params['moduloId']))    update_post_meta($post_id, '_ap_aula_modulo_id', intval($params['moduloId']));
        if (isset($params['ordem']))       update_post_meta($post_id, '_ap_aula_ordem', intval($params['ordem']));
        if (isset($params['videoUrl']))    update_post_meta($post_id, '_ap_aula_video_url', esc_url_raw($params['videoUrl']));
        if (isset($params['videoInicio'])) update_post_meta($post_id, '_ap_aula_video_inicio', intval($params['videoInicio']));
        if (isset($params['videoFim']))    update_post_meta($post_id, '_ap_aula_video_fim', intval($params['videoFim']));
        if (isset($params['duracaoMin']))  update_post_meta($post_id, '_ap_aula_duracao_min', intval($params['duracaoMin']));
    }

    private function format_aula(WP_Post $post): array {
        return [
            'id'          => $post->ID,
            'moduloId'    => get_post_meta($post->ID, '_ap_aula_modulo_id', true) ?: null,
            'titulo'      => $post->post_title,
            'descricao'   => $post->post_content,
            'ordem'       => (int) get_post_meta($post->ID, '_ap_aula_ordem', true),
            'videoUrl'    => get_post_meta($post->ID, '_ap_aula_video_url', true) ?: '',
            'videoInicio' => get_post_meta($post->ID, '_ap_aula_video_inicio', true) ?: null,
            'videoFim'    => get_post_meta($post->ID, '_ap_aula_video_fim', true) ?: null,
            'duracaoMin'  => get_post_meta($post->ID, '_ap_aula_duracao_min', true) ?: null,
            'createdAt'   => $post->post_date,
            'updatedAt'   => $post->post_modified,
        ];
    }

    private function collection_params(): array {
        return [
            'page'      => ['default' => 1, 'sanitize_callback' => 'absint'],
            'per_page'  => ['default' => 20, 'sanitize_callback' => 'absint'],
            'modulo_id' => ['default' => 0, 'sanitize_callback' => 'absint'],
        ];
    }

    private function create_params(): array {
        return [
            'titulo'       => ['required' => true, 'sanitize_callback' => 'sanitize_text_field'],
            'descricao'    => ['required' => false, 'sanitize_callback' => 'wp_kses_post'],
            'moduloId'     => ['required' => false, 'sanitize_callback' => 'absint'],
            'ordem'        => ['required' => false, 'sanitize_callback' => 'absint'],
            'videoUrl'     => ['required' => false, 'sanitize_callback' => 'esc_url_raw'],
            'videoInicio'  => ['required' => false, 'sanitize_callback' => 'absint'],
            'videoFim'     => ['required' => false, 'sanitize_callback' => 'absint'],
            'duracaoMin'   => ['required' => false, 'sanitize_callback' => 'absint'],
        ];
    }
}
