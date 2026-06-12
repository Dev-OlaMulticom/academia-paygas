<?php
if (!defined('ABSPATH')) exit;

class Academia_Certificados {

    private Academia_Auth $auth;

    public function __construct(Academia_Auth $auth) {
        $this->auth = $auth;
    }

    public function register_routes(): void {
        $ns = ACADEMIA_PAYGAS_NAMESPACE;

        register_rest_route($ns, '/certificados', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [$this, 'get_certificados'],
            'permission_callback' => $this->auth->permission_callback(),
            'args'                => $this->collection_params(),
        ]);

        register_rest_route($ns, '/certificados/(?P<id>\d+)', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [$this, 'get_certificado'],
            'permission_callback' => $this->auth->permission_callback(),
        ]);

        register_rest_route($ns, '/certificados', [
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => [$this, 'create_certificado'],
            'permission_callback' => $this->auth->permission_callback(),
            'args'                => $this->create_params(),
        ]);

        register_rest_route($ns, '/certificados/(?P<id>\d+)', [
            'methods'             => WP_REST_Server::EDITABLE,
            'callback'            => [$this, 'update_certificado'],
            'permission_callback' => $this->auth->permission_callback(),
        ]);
    }

    public function get_certificados(WP_REST_Request $request): WP_REST_Response {
        $page      = (int) $request->get_param('page') ?: 1;
        $per_page  = min((int) $request->get_param('per_page') ?: 20, 100);
        $user_id   = (int) $request->get_param('user_id');
        $trilha_id = (int) $request->get_param('trilha_id');

        $args = [
            'post_type'      => 'ap_certificate',
            'posts_per_page' => $per_page,
            'paged'          => $page,
            'post_status'    => 'publish',
            'meta_query'     => [],
        ];

        if ($user_id)   $args['meta_query'][] = ['key' => '_ap_certificate_user_id', 'value' => $user_id];
        if ($trilha_id) $args['meta_query'][] = ['key' => '_ap_certificate_trilha_id', 'value' => $trilha_id];

        $query = new WP_Query($args);
        $total = $query->found_posts;
        $data  = array_map([$this, 'format_certificado'], $query->posts);

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

    public function get_certificado(WP_REST_Request $request): WP_REST_Response {
        $post = get_post($request['id']);

        if (!$post || $post->post_type !== 'ap_certificate') {
            return new WP_Error('certificado_not_found', 'Certificado no encontrado', ['status' => 404]);
        }

        return new WP_REST_Response($this->format_certificado($post), 200);
    }

    public function create_certificado(WP_REST_Request $request): WP_REST_Response {
        $params = $request->get_json_params();

        $post_id = wp_insert_post([
            'post_title'  => 'Certificado - ' . intval($params['userId']),
            'post_type'   => 'ap_certificate',
            'post_status' => 'publish',
        ]);

        if (is_wp_error($post_id)) {
            return $post_id;
        }

        update_post_meta($post_id, '_ap_certificate_user_id', intval($params['userId']));
        update_post_meta($post_id, '_ap_certificate_trilha_id', intval($params['trilhaId']));
        update_post_meta($post_id, '_ap_certificate_status', sanitize_text_field($params['status'] ?? 'pending'));

        if (isset($params['pdfUrl'])) {
            update_post_meta($post_id, '_ap_certificate_pdf_url', esc_url_raw($params['pdfUrl']));
        }

        return new WP_REST_Response($this->format_certificado(get_post($post_id)), 201);
    }

    public function update_certificado(WP_REST_Request $request): WP_REST_Response {
        $post = get_post($request['id']);

        if (!$post || $post->post_type !== 'ap_certificate') {
            return new WP_Error('certificado_not_found', 'Certificado no encontrado', ['status' => 404]);
        }

        $params = $request->get_json_params();

        if (isset($params['status'])) {
            update_post_meta($post->ID, '_ap_certificate_status', sanitize_text_field($params['status']));
        }
        if (isset($params['pdfUrl'])) {
            update_post_meta($post->ID, '_ap_certificate_pdf_url', esc_url_raw($params['pdfUrl']));
        }
        if (isset($params['aprovadoPor'])) {
            update_post_meta($post->ID, '_ap_certificate_aprovado_por', sanitize_text_field($params['aprovadoPor']));
        }
        if (isset($params['aprovadoEm'])) {
            update_post_meta($post->ID, '_ap_certificate_aprovado_em', sanitize_text_field($params['aprovadoEm']));
        }

        return new WP_REST_Response($this->format_certificado(get_post($post->ID)), 200);
    }

    private function format_certificado(WP_Post $post): array {
        return [
            'id'           => $post->ID,
            'userId'       => get_post_meta($post->ID, '_ap_certificate_user_id', true),
            'trilhaId'     => get_post_meta($post->ID, '_ap_certificate_trilha_id', true),
            'status'       => get_post_meta($post->ID, '_ap_certificate_status', true) ?: 'pending',
            'pdfUrl'       => get_post_meta($post->ID, '_ap_certificate_pdf_url', true) ?: null,
            'aprovadoPor'  => get_post_meta($post->ID, '_ap_certificate_aprovado_por', true) ?: null,
            'aprovadoEm'   => get_post_meta($post->ID, '_ap_certificate_aprovado_em', true) ?: null,
            'createdAt'    => $post->post_date,
            'updatedAt'    => $post->post_modified,
        ];
    }

    private function collection_params(): array {
        return [
            'page'      => ['default' => 1, 'sanitize_callback' => 'absint'],
            'per_page'  => ['default' => 20, 'sanitize_callback' => 'absint'],
            'user_id'   => ['default' => 0, 'sanitize_callback' => 'absint'],
            'trilha_id' => ['default' => 0, 'sanitize_callback' => 'absint'],
        ];
    }

    private function create_params(): array {
        return [
            'userId'   => ['required' => true, 'sanitize_callback' => 'absint'],
            'trilhaId' => ['required' => true, 'sanitize_callback' => 'absint'],
            'status'   => ['required' => false, 'sanitize_callback' => 'sanitize_text_field'],
            'pdfUrl'   => ['required' => false, 'sanitize_callback' => 'esc_url_raw'],
        ];
    }
}
