import Select, { type MultiValue, type SingleValue, type StylesConfig } from "react-select";
import { cn } from "../lib/utils";

export interface SelectOption {
	value: string;
	label: string;
}

interface SelectBaseProps {
	options: SelectOption[];
	placeholder?: string;
	className?: string;
	isDisabled?: boolean;
	isSearchable?: boolean;
	isClearable?: boolean;
	noOptionsLabel?: string;
	id?: string;
	ariaLabel?: string;
	menuPortalTarget?: HTMLElement;
}

interface SingleSelectProps extends SelectBaseProps {
	isMulti?: false;
	value: string | null;
	onChange: (value: string | null) => void;
}

interface MultiSelectProps extends SelectBaseProps {
	isMulti: true;
	value: string[];
	onChange: (value: string[]) => void;
}

type AppSelectProps = SingleSelectProps | MultiSelectProps;

const customStyles: StylesConfig<SelectOption, boolean> = {
	control: (base, state) => ({
		...base,
		minHeight: "42px",
		border: `1px solid ${state.isFocused ? "var(--pg-orange, #F47C20)" : "var(--border, #e5e7eb)"}`,
		borderRadius: "8px",
		boxShadow: state.isFocused ? "0 0 0 3px rgba(244, 124, 32, 0.15)" : "none",
		background: "var(--bg-input, #fff)",
		fontSize: "14px",
		"&:hover": { borderColor: "var(--pg-orange, #F47C20)" },
	}),
	placeholder: (base) => ({
		...base,
		color: "var(--gray-400, #9ca3af)",
	}),
	singleValue: (base) => ({ ...base, color: "var(--text, #111827)" }),
	multiValue: (base) => ({
		...base,
		background: "rgba(244, 124, 32, 0.12)",
		borderRadius: "6px",
		padding: "2px 4px",
	}),
	multiValueLabel: (base) => ({ ...base, color: "#9a4d10", fontWeight: 500 }),
	multiValueRemove: (base) => ({
		...base,
		color: "#9a4d10",
		"&:hover": { background: "rgba(244, 124, 32, 0.25)", color: "#9a4d10" },
	}),
	option: (base, state) => ({
		...base,
		background: state.isSelected
			? "var(--pg-orange, #F47C20)"
			: state.isFocused
				? "rgba(244, 124, 32, 0.08)"
				: "transparent",
		color: state.isSelected ? "#fff" : "var(--text, #111827)",
		cursor: "pointer",
		fontSize: "14px",
	}),
	menu: (base) => ({
		...base,
		borderRadius: "8px",
		boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
		border: "1px solid var(--border, #e5e7eb)",
	}),
	menuPortal: (base) => ({
		...base,
		zIndex: 10001,
	}),
	input: (base) => ({ ...base, color: "var(--text, #111827)" }),
	indicatorSeparator: () => ({ display: "none" }),
	dropdownIndicator: (base) => ({ ...base, color: "var(--gray-500, #6b7280)", paddingRight: 8 }),
	clearIndicator: (base) => ({ ...base, color: "var(--gray-500, #6b7280)", paddingRight: 8 }),
	loadingIndicator: (base) => ({ ...base, color: "var(--pg-orange, #F47C20)" }),
};

export function AppSelect(props: AppSelectProps) {
	const {
		options,
		placeholder,
		className,
		isDisabled,
		isSearchable = true,
		isClearable,
		noOptionsLabel,
		id,
		ariaLabel,
		menuPortalTarget,
	} = props;

	const isMulti = props.isMulti === true;
	const value = isMulti
		? options.filter((o) => (props.value as string[]).includes(o.value))
		: (options.find((o) => o.value === props.value) ?? null);

	const handleChange = (newValue: SingleValue<SelectOption> | MultiValue<SelectOption>) => {
		if (isMulti) {
			const arr = newValue as MultiValue<SelectOption>;
			(props as MultiSelectProps).onChange(arr.map((o) => o.value));
		} else {
			const v = newValue as SingleValue<SelectOption>;
			(props as SingleSelectProps).onChange(v?.value ?? null);
		}
	};

	return (
		<div className={cn("pg-select", className)}>
			<Select<SelectOption, boolean>
				inputId={id}
				aria-label={ariaLabel}
				options={options}
				placeholder={placeholder}
				isMulti={isMulti}
				isDisabled={isDisabled}
				isSearchable={isSearchable}
				isClearable={isClearable}
				noOptionsMessage={() => noOptionsLabel ?? "Nenhuma opcao disponivel"}
				value={value}
				onChange={handleChange}
				styles={customStyles}
				menuPortalTarget={menuPortalTarget ?? (typeof document !== "undefined" ? document.body : undefined)}
				menuShouldScrollIntoView={false}
			/>
		</div>
	);
}
