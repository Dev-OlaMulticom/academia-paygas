-- Update role labels to match new naming convention
UPDATE "RoleConfig" SET label = 'SuperAdministrador' WHERE role = 'ADMIN';
UPDATE "RoleConfig" SET label = 'Gestor / Líder' WHERE role = 'GESTOR';
UPDATE "RoleConfig" SET label = 'Administrador' WHERE role = 'PARCEIRO_ACREDITADO';
