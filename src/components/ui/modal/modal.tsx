import { Dialog } from "@base-ui/react/dialog";
import type {
    DialogDescriptionProps,
    DialogPopupProps,
    DialogRootProps,
    DialogTitleProps,
    DialogTriggerProps,
} from "@base-ui/react/dialog";
import { X } from "lucide-react";
import type { ComponentProps, PropsWithChildren } from "react";

import { IconButton } from "@/components/ui/icon-button/icon-button";
import { cn } from "@/lib/core/styling/cn";
import type { ClassNameProp } from "@/types/props";

/*
 * D-15: focus trapping, scroll locking, Escape-to-close and label/description wiring all come
 * from Base UI's Dialog composition — no `useEffect` touching `document.activeElement`. D-18:
 * Modal is content-driven, no size axis; width is a `className` escape hatch (see 01-CONTEXT.md).
 */

/*
 * `isDismissableOnBackdropClick` is the public, inverted spelling of Base UI's
 * `disablePointerDismissal` (D-26's `is`-prefix convention, see 01-CONTEXT.md); `open`/
 * `disablePointerDismissal` are omitted so there's no second way to say the same thing.
 */
type RootProps = PropsWithChildren<
    Omit<DialogRootProps, "open" | "disablePointerDismissal" | "onOpenChange" | "children"> & {
        isOpen?: boolean;
        isDismissableOnBackdropClick?: boolean;
        onOpenChange?: (isOpen: boolean) => void;
    }
>;

/*
 * Modal has no `isLoading` prop — that state belongs to the async action inside it (e.g. a
 * `Modal.Footer` Button). A consumer driving one composes `isDismissableOnBackdropClick={!isLoading}`
 * with a guarded `onOpenChange` (Escape bypasses the backdrop-only prop) — see 01-25-SUMMARY.md (GC-16).
 */
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

type TriggerProps = Omit<DialogTriggerProps, "className"> & ClassNameProp;

/*
 * Unstyled by design — a modal's opener is ordinarily a real `Button` composed in via Base UI's
 * `render` prop (`<Modal.Trigger render={<Button>Open</Button>} />`), so this wrapper contributes
 * wiring, not visuals.
 */
const Trigger = ({ className, ...props }: TriggerProps) => {
    return <Dialog.Trigger className={className} {...props} />;
};

type ContentProps = Omit<DialogPopupProps, "className"> & ClassNameProp;

/*
 * Panel tokens/mobile padding measured and reviewed in 01-04-SUMMARY.md and ADR tech/0010. Outer
 * `Dialog.Popup` owns the silhouette (radius/shadow/clip); an inner `div` owns the scroll region,
 * so the rounded corners stay intact once content actually scrolls (see 01-09-SUMMARY.md addendum).
 */
const Content = ({ className, children, ...props }: ContentProps) => {
    return (
        <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50" />

            <Dialog.Popup
                className={cn(
                    "fixed top-1/2 left-1/2 z-50 max-h-[calc(100vh-6rem)] w-[min(90vw,28rem)] -translate-1/2 overflow-hidden rounded-md bg-bg-surface shadow-lg outline-none",
                    className,
                )}
                {...props}
            >
                <div className="max-h-[calc(100vh-6rem)] overflow-y-auto p-4 md:p-6">{children}</div>

                {/* Sibling of the scroll region, not a child: inside it the control would scroll
                    away with the content. Last, so it stays last in the tab order. */}
                <Dialog.Close
                    render={
                        <IconButton
                            type="button"
                            label="Close"
                            icon={<X />}
                            className="absolute top-1 right-1 md:top-2 md:right-2"
                        />
                    }
                />
            </Dialog.Popup>
        </Dialog.Portal>
    );
};

type TitleProps = Omit<DialogTitleProps, "className"> & ClassNameProp;

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

type DescriptionProps = Omit<DialogDescriptionProps, "className"> & ClassNameProp;

const Description = ({ className, ...props }: DescriptionProps) => {
    return (
        <Dialog.Description
            className={cn("font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-muted", className)}
            {...props}
        />
    );
};

type FooterProps = ComponentProps<"div">;

/*
 * A plain right-aligned flex row (UI-SPEC-adjacent composition, not a Base UI part of its own) —
 * footer actions are consumer-composed `Button`s, per the primitive contract's Dropdown/Checkbox
 * precedent of building layout-only sub-components from plain elements where Base UI has none.
 */
const Footer = ({ className, ...props }: FooterProps) => {
    return <div className={cn("flex items-center justify-end gap-4", className)} {...props} />;
};

/*
 * No `Close` part: `Content` renders the dismiss control itself, so a consumer-composed one would be
 * a second way to do the same thing. Reintroduce it only if a modal needs a close in its own body.
 */
export const Modal = { Root, Trigger, Content, Title, Description, Footer };
