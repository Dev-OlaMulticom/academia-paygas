import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/utils";

interface PasswordInputProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	autoComplete?: string;
	id?: string;
	ariaLabel?: string;
}

export function PasswordInput({
	value,
	onChange,
	placeholder,
	className,
	disabled,
	autoComplete,
	id,
	ariaLabel,
}: PasswordInputProps) {
	const [visible, setVisible] = useState(false);

	return (
		<div className={cn("pg-pwd-wrap", className)}>
			<input
				id={id}
				type={visible ? "text" : "password"}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				disabled={disabled}
				autoComplete={autoComplete}
				aria-label={ariaLabel ?? "password"}
				className="pg-pwd-input"
			/>
			<button
				type="button"
				className="pg-pwd-toggle"
				onClick={() => setVisible((v) => !v)}
				disabled={disabled}
				aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
				tabIndex={-1}
			>
				{visible ? <EyeOff size={18} /> : <Eye size={18} />}
			</button>
		</div>
	);
}
