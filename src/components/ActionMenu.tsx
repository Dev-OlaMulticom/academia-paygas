import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface ActionMenuItem {
	label: string;
	icon?: string;
	onClick: () => void;
	variant?: "default" | "danger" | "success" | "primary";
	disabled?: boolean;
	hidden?: boolean;
}

interface ActionMenuProps {
	items: ActionMenuItem[];
	align?: "left" | "right";
}

export function ActionMenu({ items, align = "right" }: ActionMenuProps) {
	const [open, setOpen] = useState(false);
	const triggerRef = useRef<HTMLDivElement>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

	const visibleItems = items.filter((i) => !i.hidden);

	const close = useCallback(() => setOpen(false), []);

	useEffect(() => {
		if (!open) return;
		const handler = (e: MouseEvent) => {
			const target = e.target as Node;
			const inTrigger = triggerRef.current?.contains(target);
			const inDropdown = dropdownRef.current?.contains(target);
			if (!inTrigger && !inDropdown) close();
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [open, close]);

	useEffect(() => {
		if (!open) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") close();
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [open, close]);

	const handleToggle = useCallback(() => {
		if (!open && triggerRef.current) {
			const rect = triggerRef.current.getBoundingClientRect();
			setMenuPos({
				top: rect.bottom + 4,
				left: align === "left" ? rect.left : rect.right - 160,
			});
		}
		setOpen((v) => !v);
	}, [open, align]);

	if (visibleItems.length === 0) return null;

	return (
		<div className={`action-menu ${align === "left" ? "action-menu-left" : ""}`} ref={triggerRef}>
			<button
				className="action-menu-trigger"
				onClick={(e) => {
					e.stopPropagation();
					handleToggle();
				}}
				title="Acoes"
			>
				<i className="icon-ellipsis icon-xs" />
			</button>
			{open &&
				createPortal(
					<div
						ref={dropdownRef}
						className="action-menu-dropdown"
						style={{ position: "fixed", top: menuPos.top, left: menuPos.left }}
					>
						{visibleItems.map((item, idx) => (
							<button
								key={`${item.label}-${idx}`}
								className={`action-menu-item ${item.variant === "danger" ? "action-menu-danger" : ""} ${item.variant === "success" ? "action-menu-success" : ""} ${item.variant === "primary" ? "action-menu-primary" : ""}`}
								disabled={item.disabled}
								onClick={() => {
									close();
									item.onClick();
								}}
							>
								{item.icon && <i className={`${item.icon} icon-xs`} />}
								<span>{item.label}</span>
							</button>
						))}
					</div>,
					document.body,
				)}
		</div>
	);
}
