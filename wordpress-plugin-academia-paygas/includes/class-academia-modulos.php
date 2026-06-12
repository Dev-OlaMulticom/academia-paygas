<?php
if (!defined('ABSPATH')) exit;

class Academia_Modulos {

    private Academia_Auth $auth;

    public function __construct(Academia_Auth $auth) {
        $this->auth = $auth;
    }

    public function register_routes(): void {
        $ns = 'academia-paygas/v1';

        register_rest_route($ns, '/modulos', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [$this, 'get_modulos'],
            'permission_callback' => $this->auth->permission_callback(),
            'args'                => $this->collection_params(),
        ]);

        register_rest_route($ns, '/modulos/(?P<id>\d+)', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [$this, 'get_modulo'],
            'permission_callback' => $this->auth->permission_callback(),
        ]);

        register_rest_route($ns, '/modulos', [
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => [$this, 'create_modulo'],
            'permission_callback' => $this->auth->permission_callback(),
            'args'                => $this->create_params(),
        ]);

        register_rest_route($ns, '/modulos/(?P<id>\d+)', [
            'methods'             => WP_REST_Server::EDITABLE,
            'callback'            => [$this, 'update_modulo'],
            'permission_callback' => $this->auth->permission_callback(),
        ]);

        register_rest_route($ns, '/modulos/(?P<id>\d+)', [
            'methods'             => WP_REST_Server::DELETABLE,
            'callback'            => [$this, 'delete_modulo'],
            'permission_callback' => $this->auth->permission_callback(),
        ]);
    }

    public function get_modulos(WP_REST_Request $request): WP_REST_Response {
        $page      = (int) $request->get_param('page') ?: 1;
        $per_page  = min((int) $request->get_param('per_page') ?: 20, 100);
        $trilha_id = (int) $request->get_param('trilha_id');

        $args = [
            'taxonomy'   => 'ap_modulo',
            'hide_empty' => false,
            'number'     => $per_page,
            'offset'     => ($page - 1) * $per_page,
        ];

        if ($trilha_id) {
            $args['meta_query'] = [[
                'key'   => '_ap_modulo_trilha_id',
                'value' => $trilha_id,
            ]];
        }

        $terms = get_terms($args);
        $total_query = new WP_Term_Query($args);
        $total       = count($total_query->get_terms());
        $data        = is_wp_error($terms) ? [] : array_map([$this, 'format_modulo'], $terms);

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

    public function get_modulo(WP_REST_Request $request): WP_REST_Response {
        $term = get_term($request['id'], 'ap_modulo');

        if (!$term || is_wp_error($term)) {
            return new WP_Error('modulo_not_found', 'Modulo no encontrado', ['status' => 404]);
        }

        return new WP_REST_Response($this->format_modulo($term), 200);
    }

    public function create_modulo(WP_REST_Request $request): WP_REST_Response {
        $params = $request->get_json_params();

        $term = wp_insert_term(sanitize_text_field($params['titulo']), 'ap_modulo', [
            'description' => sanitize_textarea_field($params['descricao'] ?? ''),
        ]);

        if (is_wp_error($term)) {
            return $term;
        }

        $term_id = $term['term_id'];
        $this->save_term_meta($term_id, $params);

        return new WP_REST_Response($this->format_modulo(get_term($term_id, 'ap_modulo')), 201);
    }

    public function update_modulo(WP_REST_Request $request): WP_REST_Response {
        $term = get_term($request['id'], 'ap_modulo');

        if (!$term || is_wp_error($term)) {
            return new WP_Error('modulo_not_found', 'Modulo no encontrado', ['status' => 404]);
        }

        $params = $request->get_json_params();
        $args   = [];

        if (isset($params['titulo']))    $args['name']        = sanitize_text_field($params['titulo']);
        if (isset($params['descricao'])) $args['description'] = sanitize_textarea_field($params['descricao']);

        if (!empty($args)) {
            wp_update_term($term->term_id, 'ap_modulo', $args);
        }

        $this->save_term_meta($term->term_id, $params);

        return new WP_REST_Response($this->format_modulo(get_term($term->term_id, 'ap_modulo')), 200);
    }

    public function delete_modulo(WP_REST_Request $request): WP_REST_Response {
        $result = wp_delete_term($request['id'], 'ap_modulo');

        if (is_wp_error($result) || $result === false) {
            return new WP_Error('delete_failed', 'Error al eliminar modulo', ['status' => 500]);
        }

        return new WP_REST_Response(['message' => 'Modulo eliminado'], 200);
    }

    private function save_term_meta(int $term_id, array $params): void {
        if (isset($params['trilhaId']))    update_term_meta($term_id, '_ap_modulo_trilha_id', intval($params['trilhaId']));
        if (isset($params['ordem']))       update_term_meta($term_id, '_ap_modulo_ordem', intval($params['ordem']));
        if (isset($params['videoUrl']))    update_term_meta($term_id, '_ap_modulo_video_url', esc_url_raw($params['videoUrl']));
        if (isset($params['videoInicio'])) update_term_meta($term_id, '_ap_modulo_video_inicio', intval($params['videoInicio']));
        if (isset($params['videoFim']))    update_term_meta($term_id, '_ap_modulo_video_fim', intval($params['videoFim']));
    }

    private function format_modulo(WP_Term $term): array {
        return [
            'id'          => $term->term_id,
            'trilhaId'    => get_term_meta($term->term_id, '_ap_modulo_trilha_id', true) ?: null,
            'titulo'      => $term->name,
            'descricao'   => $term->description,
            'ordem'       => (int) get_term_meta($term->term_id, '_ap_modulo_ordem', true),
            'videoUrl'    => get_term_meta($term->term_id, '_ap_modulo_video_url', true) ?: '',
            'videoInicio' => get_term_meta($term->term_id, '_ap_modulo_video_inicio', true) ?: null,
            'videoFim'    => get_term_meta($term->term_id, '_ap_modulo_video_fim', true) ?: null,
            'count'       => $term->count,
        ];
    }

    private function collection_params(): array {
        return [
            'page'      => ['default' => 1, 'sanitize_callback' => 'absint'],
            'per_page'  => ['default' => 20, 'sanitize_callback' => 'absint'],
            'trilha_id' => ['default' => 0, 'sanitize_callback' => 'absint'],
        ];
    }

    private function create_params(): array {
        return [
            'titulo'       => ['required' => true, 'sanitize_callback' => 'sanitize_text_field'],
            'descricao'    => ['required' => false, 'sanitize_callback' => 'sanitize_textarea_field'],
            'trilhaId'     => ['required' => false, 'sanitize_callback' => 'absint'],
            'ordem'        => ['required' => false, 'sanitize_callback' => 'absint'],
            'videoUrl'     => ['required' => false, 'sanitize_callback' => 'esc_url_raw'],
            'videoInicio'  => ['required' => false, 'sanitize_callback' => 'absint'],
            'videoFim'     => ['required' => false, 'sanitize_callback' => 'absint'],
        ];
    }
}
