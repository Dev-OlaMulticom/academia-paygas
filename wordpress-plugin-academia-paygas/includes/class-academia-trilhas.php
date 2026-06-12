<?php
if (!defined('ABSPATH')) exit;

class Academia_Trilhas {

    private Academia_Auth $auth;

    public function __construct(Academia_Auth $auth) {
        $this->auth = $auth;
    }

    public function register_routes(): void {
        $ns = ACADEMIA_PAYGAS_NAMESPACE;

        register_rest_route($ns, '/trilhas', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [$this, 'get_trilhas'],
            'permission_callback' => $this->auth->permission_callback(),
            'args'                => $this->collection_params(),
        ]);

        register_rest_route($ns, '/trilhas/(?P<id>\d+)', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [$this, 'get_trilha'],
            'permission_callback' => $this->auth->permission_callback(),
        ]);

        register_rest_route($ns, '/trilhas', [
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => [$this, 'create_trilha'],
            'permission_callback' => $this->auth->permission_callback(),
            'args'                => $this->create_params(),
        ]);

        register_rest_route($ns, '/trilhas/(?P<id>\d+)', [
            'methods'             => WP_REST_Server::EDITABLE,
            'callback'            => [$this, 'update_trilha'],
            'permission_callback' => $this->auth->permission_callback(),
        ]);

        register_rest_route($ns, '/trilhas/(?P<id>\d+)', [
            'methods'             => WP_REST_Server::DELETABLE,
            'callback'            => [$this, 'delete_trilha'],
            'permission_callback' => $this->auth->permission_callback(),
        ]);
    }

    public function get_trilhas(WP_REST_Request $request): WP_REST_Response {
        $page     = (int) $request->get_param('page') ?: 1;
        $per_page = min((int) $request->get_param('per_page') ?: 20, 100);

        $terms = get_terms([
            'taxonomy'   => 'ap_trilha',
            'hide_empty' => false,
            'number'     => $per_page,
            'offset'     => ($page - 1) * $per_page,
        ]);

        $total = wp_count_terms('ap_trilha', ['hide_empty' => false]);
        $data  = is_wp_error($terms) ? [] : array_map([$this, 'format_trilha'], $terms);

        return new WP_REST_Response([
            'data'       => $data,
            'pagination' => [
                'total'       => (int) $total,
                'total_pages' => (int) ceil($total / $per_page),
                'page'        => $page,
                'per_page'    => $per_page,
            ],
        ], 200);
    }

    public function get_trilha(WP_REST_Request $request): WP_REST_Response {
        $term = get_term($request['id'], 'ap_trilha');

        if (!$term || is_wp_error($term)) {
            return new WP_Error('trilha_not_found', 'Trilha no encontrada', ['status' => 404]);
        }

        return new WP_REST_Response($this->format_trilha($term), 200);
    }

    public function create_trilha(WP_REST_Request $request): WP_REST_Response {
        $params = $request->get_json_params();

        $term = wp_insert_term(sanitize_text_field($params['titulo']), 'ap_trilha', [
            'description' => sanitize_textarea_field($params['descricao'] ?? ''),
        ]);

        if (is_wp_error($term)) {
            return $term;
        }

        $term_id = $term['term_id'];
        $this->save_term_meta($term_id, $params);

        return new WP_REST_Response($this->format_trilha(get_term($term_id, 'ap_trilha')), 201);
    }

    public function update_trilha(WP_REST_Request $request): WP_REST_Response {
        $term = get_term($request['id'], 'ap_trilha');

        if (!$term || is_wp_error($term)) {
            return new WP_Error('trilha_not_found', 'Trilha no encontrada', ['status' => 404]);
        }

        $params = $request->get_json_params();
        $args   = [];

        if (isset($params['titulo']))     $args['name']        = sanitize_text_field($params['titulo']);
        if (isset($params['descricao']))  $args['description'] = sanitize_textarea_field($params['descricao']);

        if (!empty($args)) {
            wp_update_term($term->term_id, 'ap_trilha', $args);
        }

        $this->save_term_meta($term->term_id, $params);

        return new WP_REST_Response($this->format_trilha(get_term($term->term_id, 'ap_trilha')), 200);
    }

    public function delete_trilha(WP_REST_Request $request): WP_REST_Response {
        $result = wp_delete_term($request['id'], 'ap_trilha');

        if (is_wp_error($result) || $result === false) {
            return new WP_Error('delete_failed', 'Error al eliminar trilha', ['status' => 500]);
        }

        return new WP_REST_Response(['message' => 'Trilha eliminada'], 200);
    }

    private function save_term_meta(int $term_id, array $params): void {
        if (isset($params['icon'])) {
            update_term_meta($term_id, '_ap_trilha_icon', sanitize_text_field($params['icon']));
        }
        if (isset($params['color'])) {
            update_term_meta($term_id, '_ap_trilha_color', sanitize_hex_color($params['color']));
        }
        if (isset($params['obrigatorio'])) {
            update_term_meta($term_id, '_ap_trilha_obrigatorio', $params['obrigatorio'] ? '1' : '0');
        }
    }

    private function format_trilha(WP_Term $term): array {
        return [
            'id'           => $term->term_id,
            'titulo'       => $term->name,
            'descricao'    => $term->description,
            'icon'         => get_term_meta($term->term_id, '_ap_trilha_icon', true) ?: '',
            'color'        => get_term_meta($term->term_id, '_ap_trilha_color', true) ?: '',
            'obrigatorio'  => get_term_meta($term->term_id, '_ap_trilha_obrigatorio', true) === '1',
            'count'        => $term->count,
        ];
    }

    private function collection_params(): array {
        return [
            'page'     => ['default' => 1, 'sanitize_callback' => 'absint'],
            'per_page' => ['default' => 20, 'sanitize_callback' => 'absint'],
        ];
    }

    private function create_params(): array {
        return [
            'titulo'       => ['required' => true, 'sanitize_callback' => 'sanitize_text_field'],
            'descricao'    => ['required' => false, 'sanitize_callback' => 'sanitize_textarea_field'],
            'icon'         => ['required' => false, 'sanitize_callback' => 'sanitize_text_field'],
            'color'        => ['required' => false, 'sanitize_callback' => 'sanitize_hex_color'],
            'obrigatorio'  => ['required' => false],
        ];
    }
}