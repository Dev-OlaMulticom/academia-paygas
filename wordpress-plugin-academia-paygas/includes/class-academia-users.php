<?php
if (!defined('ABSPATH')) exit;

class Academia_Users {

    private Academia_Auth $auth;

    public function __construct(Academia_Auth $auth) {
        $this->auth = $auth;
    }

    public function register_routes(): void {
        $ns = ACADEMIA_PAYGAS_NAMESPACE;

        register_rest_route($ns, '/users', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [$this, 'get_users'],
            'permission_callback' => $this->auth->permission_callback(),
            'args'                => $this->collection_params(),
        ]);

        register_rest_route($ns, '/users/(?P<id>\d+)', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [$this, 'get_user'],
            'permission_callback' => $this->auth->permission_callback(),
        ]);

        register_rest_route($ns, '/users/me', [
            'methods'             => WP_REST_Server::READABLE,
            'callback'            => [$this, 'get_me'],
            'permission_callback' => function() {
                return is_user_logged_in();
            },
        ]);

        register_rest_route($ns, '/users', [
            'methods'             => WP_REST_Server::CREATABLE,
            'callback'            => [$this, 'create_user'],
            'permission_callback' => $this->auth->permission_callback(),
            'args'                => $this->create_params(),
        ]);

        register_rest_route($ns, '/users/(?P<id>\d+)', [
            'methods'             => WP_REST_Server::EDITABLE,
            'callback'            => [$this, 'update_user'],
            'permission_callback' => $this->auth->permission_callback(),
        ]);

        register_rest_route($ns, '/users/(?P<id>\d+)', [
            'methods'             => WP_REST_Server::DELETABLE,
            'callback'            => [$this, 'delete_user'],
            'permission_callback' => $this->auth->permission_callback(),
        ]);
    }

    public function get_users(WP_REST_Request $request): WP_REST_Response {
        $page     = (int) $request->get_param('page') ?: 1;
        $per_page = min((int) $request->get_param('per_page') ?: 20, 100);
        $offset   = ($page - 1) * $per_page;

        $args = [
            'role__in'   => ['academia_admin', 'academia_gestor', 'academia_atendente'],
            'number'     => $per_page,
            'offset'     => $offset,
            'orderby'    => 'ID',
            'order'      => 'ASC',
        ];

        $users_query = new WP_User_Query($args);
        $total       = $users_query->get_total();
        $users       = $users_query->get_results();
        $data        = array_map([$this, 'format_user'], $users);

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

    public function get_user(WP_REST_Request $request): WP_REST_Response {
        $user = get_user_by('id', $request['id']);

        if (!$user) {
            return new WP_Error('user_not_found', 'Usuario no encontrado', ['status' => 404]);
        }

        return new WP_REST_Response($this->format_user($user), 200);
    }

    public function get_me(WP_REST_Request $request): WP_REST_Response {
        $current_user = wp_get_current_user();

        if (!$current_user || $current_user->ID === 0) {
            return new WP_Error('user_not_logged_in', 'Usuario no autenticado', ['status' => 401]);
        }

        return new WP_REST_Response($this->format_user($current_user), 200);
    }

    public function create_user(WP_REST_Request $request): WP_REST_Response {
        $params = $request->get_json_params();

        // Extract username from email prefix (before @)
        $email = sanitize_email($params['email']);
        
        // Check if email already exists
        if (email_exists($email)) {
            return new WP_Error('email_exists', 'El email ya está registrado en el sistema.', ['status' => 409]);
        }
        
        $username = explode('@', $email)[0];
        
        // Ensure username is unique
        $original_username = $username;
        $counter = 1;
        while (username_exists($username)) {
            $username = $original_username . $counter;
            $counter++;
        }

        $user_id = wp_create_user(
            $username,
            $params['senha'],
            $email
        );

        if (is_wp_error($user_id)) {
            return $user_id;
        }

        $user = get_user_by('id', $user_id);
        $user->display_name = sanitize_text_field($params['nome']);
        wp_update_user($user);
        $user->set_role(sanitize_text_field($params['role']));

        if (!empty($params['gestorId'])) {
            update_user_meta($user_id, '_ap_gestor_id', intval($params['gestorId']));
        }

        return new WP_REST_Response($this->format_user(get_user_by('id', $user_id)), 201);
    }

    public function update_user(WP_REST_Request $request): WP_REST_Response {
        $user = get_user_by('id', $request['id']);

        if (!$user) {
            return new WP_Error('user_not_found', 'Usuario no encontrado', ['status' => 404]);
        }

        $params = $request->get_json_params();

        if (isset($params['nome']))  $user->display_name = sanitize_text_field($params['nome']);
        if (isset($params['email'])) $user->user_email   = sanitize_email($params['email']);
        if (isset($params['senha'])) wp_set_password($params['senha'], $user->ID);
        if (isset($params['role']))  $user->set_role(sanitize_text_field($params['role']));

        wp_update_user($user);

        if (isset($params['gestorId'])) {
            update_user_meta($user->ID, '_ap_gestor_id', intval($params['gestorId']));
        }

        return new WP_REST_Response($this->format_user(get_user_by('id', $user->ID)), 200);
    }

    public function delete_user(WP_REST_Request $request): WP_REST_Response {
        if (wp_delete_user($request['id'])) {
            return new WP_REST_Response(['message' => 'Usuario eliminado'], 200);
        }
        return new WP_Error('delete_failed', 'Error al eliminar usuario', ['status' => 500]);
    }

    private function format_user(WP_User $user): array {
        return [
            'id'        => $user->ID,
            'email'     => $user->user_email,
            'nome'      => $user->display_name,
            'role'      => $user->roles[0] ?? '', // Primary role (first in array)
            'roles'     => $user->roles, // All roles for complete information
            'gestorId'  => get_user_meta($user->ID, '_ap_gestor_id', true) ?: null,
            'createdAt' => $user->user_registered,
            'lastLogin' => get_user_meta($user->ID, '_ap_last_login', true) ?: null,
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
            'email'    => ['required' => true, 'sanitize_callback' => 'sanitize_email'],
            'nome'     => ['required' => true, 'sanitize_callback' => 'sanitize_text_field'],
            'senha'    => ['required' => true],
            'role'     => ['required' => true, 'sanitize_callback' => 'sanitize_text_field'],
            'gestorId' => ['required' => false, 'sanitize_callback' => 'absint'],
        ];
    }
}
