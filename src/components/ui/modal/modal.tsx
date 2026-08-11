import { Dialog } from "@base-ui/react/dialog";
import type {
    DialogCloseProps,
    DialogDescriptionProps,
    DialogPopupProps,
    DialogRootProps,
    DialogTitleProps,
    DialogTriggerProps,
} from "@base-ui/react/dialog";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

// D-15: focus trapping, scroll locking, Escape-to-close, focus restoration and the
// aria-labelledby/aria-describedby wiring from Modal.Title/Modal.Description all come from Base
// UI's Dialog composition (Root/Trigger/Portal/Backdrop/Popup/Title/Description/Close) — this file
// contains no `useEffect` reading or writing `document.activeElement`. Per D-18, Modal is
// content-driven and takes no size axis; width is a `className` escape hatch on `Modal.Content`
// (this plan's own prop-shape decision), not a `cva` size variant like the sized primitives.

// `isDismissableOnBackdropClick` is the public spelling of Base UI's `disablePointerDismissal`
// (inverted, D-26s `is`-prefix convention); `open`/`disablePointerDismissal` are omitted from the
// public props so a consumer can only reach them through `isOpen`/`isDismissableOnBackdropClick` —
// no two conflicting ways to say the same thing.
type RootProps = Omit<DialogRootProps, "open" | "disablePointerDismissal" | "onOpenChange" | "children"> & {
    isOpen?: boolean;
    isDismissableOnBackdropClick?: boolean;
    onOpenChange?: (isOpen: boolean) => void;
    children?: ReactNode;
};

const Root = ({ isOpen, isDismissableOnBackdropClick = true, onOpenChange, children, ...props }: RootProps) => {
    return (
        <Dialog.Root
            open={isOpen}
            disablePointerDismissal={!isDismissableOnBackdropClick}
            onOpenChange={(open) => onOpenChange?.(open)}
            {...props}
        >
            {children}
        </Dialog.Root>
    );
};

type TriggerProps = Omit<DialogTriggerProps, "className"> & { className?: string };

// Unstyled by design — a modal's opener is ordinarily a real `Button` composed in via Base UI's
// `render` prop (`<Modal.Trigger render={<Button>Open</Button>} />`), so this wrapper contributes
// wiring, not visuals.
const Trigger = ({ className, ...props }: TriggerProps) => {
    return <Dialog.Trigger className={className} {...props} />;
};

type ContentProps = Omit<DialogPopupProps, "className"> & { className?: string };

// UI-SPEC Color/Spacing: panel `bg-bg-surface` at the `radius.lg`/`shadow.lg` tokens measured in
// plan 01-04, `p-6` (24px) internal padding. The backdrop is a fixed black scrim at reduced
// opacity regardless of the active theme — a dimming overlay is not a themed surface, the same
// mode-invariant treatment this pipeline already gives the shadow tokens (src/styles/tokens.css
// defines shadow-sm/md/lg once, with no `.dark` override).
const Content = ({ className, children, ...props }: ContentProps) => {
    return (
        <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50" />
            <Dialog.Popup
                className={cn(
                    "fixed top-1/2 left-1/2 z-50 max-h-[calc(100vh-6rem)] w-[min(90vw,28rem)] -translate-1/2 overflow-y-auto rounded-lg bg-bg-surface p-6 shadow-lg outline-none",
                    className,
                )}
                {...props}
            >
                {children}
            </Dialog.Popup>
        </Dialog.Portal>
    );
};

type TitleProps = Omit<DialogTitleProps, "className"> & { className?: string };

const Title = ({ className, ...props }: TitleProps) => {
    return (
        <Dialog.Title
            className={cn(
                "font-heading-l text-heading-l [font-weight:var(--font-weight-heading-l)] text-text-primary",
                className,
            )}
            {...props}
        />
    );
};

type DescriptionProps = Omit<DialogDescriptionProps, "className"> & { className?: string };

const Description = ({ className, ...props }: DescriptionProps) => {
    return (
        <Dialog.Description
            className={cn("font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-muted", className)}
            {...props}
        />
    );
};

type FooterProps = ComponentProps<"div">;

// A plain right-aligned flex row (UI-SPEC-adjacent composition, not a Base UI part of its own) —
// footer actions are consumer-composed `Button`s, per the primitive contract's Dropdown/Checkbox
// precedent of building layout-only sub-components from plain elements where Base UI has none.
const Footer = ({ className, ...props }: FooterProps) => {
    return <div className={cn("flex items-center justify-end gap-4", className)} {...props} />;
};

type CloseProps = Omit<DialogCloseProps, "className"> & { className?: string };

const Close = ({ className, ...props }: CloseProps) => {
    return <Dialog.Close className={className} {...props} />;
};

export const Modal = { Root, Trigger, Content, Title, Description, Footer, Close };
