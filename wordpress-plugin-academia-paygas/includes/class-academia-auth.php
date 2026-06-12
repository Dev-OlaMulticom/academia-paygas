<?php
if (!defined('ABSPATH')) exit;

class Academia_Auth {

    public function __construct() {
        // Nothing needed in constructor
    }

    /**
     * Reusable permission callback for register_rest_route
     */
    public function permission_callback(): Closure {
        return function (WP_REST_Request $request) {
            return $this->authenticate($request);
        };
    }

    /**
     * Authenticate via X-API-Key header or query param
     */
    public function authenticate(WP_REST_Request $request) {
        $key = get_option('academia_paygas_api_key', '');
        $sent_key = $request->get_header('X-API-Key');

        if (empty($sent_key)) {
            $sent_key = $request->get_param('api_key');
        }

        if (empty($key) || empty($sent_key)) {
            return new WP_Error('rest_forbidden', 'API Key requerida.', ['status' => 401]);
        }

        if (!hash_equals($key, $sent_key)) {
            return new WP_Error('rest_forbidden', 'API Key inválida.', ['status' => 403]);
        }

        if (!$this->check_rate_limit()) {
            return new WP_Error('rest_too_many_requests', 'Límite de solicitudes excedido.', ['status' => 429]);
        }

        return true;
    }

    /**
     * Rate limiting via transients (60 req/min per IP)
     */
    private function check_rate_limit(): bool {
        $limit = (int) get_option('academia_paygas_rate_limit', 60);
        $ip = $this->get_client_ip();
        $transient = 'ap_rl_' . md5($ip);
        $current = get_transient($transient);

        if (false === $current) {
            set_transient($transient, 1, 60);
            return true;
        }

        if ((int) $current >= $limit) {
            return false;
        }

        set_transient($transient, (int) $current + 1, 60);
        return true;
    }

    /**
     * Get client IP (Cloudflare aware)
     */
    private function get_client_ip(): string {
        if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
            return $_SERVER['HTTP_CF_CONNECTING_IP'];
        }
        if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
            return trim($ips[0]);
        }
        if (!empty($_SERVER['HTTP_X_REAL_IP'])) {
            return $_SERVER['HTTP_X_REAL_IP'];
        }
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }
}
