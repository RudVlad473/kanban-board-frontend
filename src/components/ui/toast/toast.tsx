"use client";

import { Toast as BaseToast } from "@base-ui/react/toast";
import type {
    ToastActionProps,
    ToastCloseProps,
    ToastContentProps,
    ToastDescriptionProps,
    ToastProviderProps as BaseToastProviderProps,
    ToastRootProps as BaseToastRootProps,
    ToastTitleProps,
} from "@base-ui/react/toast";
import { cva } from "class-variance-authority";
import { X } from "lucide-react";
import type { PropsWithChildren } from "react";

import { cn } from "@/lib/core/styling/cn";
import type { ClassNameProp } from "@/types/props";

/*
 * D-04/D-09/D-15: raise a toast via `useToast().add(...)` from anywhere in the tree — no portal,
 * timer or ARIA-live wiring of its own; reads `Toast.Provider`'s per-render-tree store, avoiding
 * the module-scope-manager cross-SSR-request leak `query-client.tsx` documents (see 02-07-SUMMARY.md).
 */
export const useToast = BaseToast.useToastManager;

/*
 * Danger accent reads `toast.type` (not a separate `variant` prop) — Base UI's own `ToastObject`
 * already carries `type` for styling. `rounded-sm` matches TextField/Dropdown's radius per human
 * review, not Modal's `rounded-lg`; surface color/shadow still match Modal (see 02-07-SUMMARY.md).
 */
const rootVariants = cva(
    "pointer-events-auto relative w-[min(90vw,24rem)] overflow-hidden rounded-sm border-l-4 bg-bg-surface shadow-lg",
    {
        variants: {
            variant: {
                default: "border-l-transparent",
                danger: "border-l-border-danger",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    },
);

type RootProps = Omit<BaseToastRootProps, "className"> & ClassNameProp;

const Root = ({ className, toast, ...props }: RootProps) => {
    const variant = toast.type === "danger" ? "danger" : "default";
    return <BaseToast.Root toast={toast} className={cn(rootVariants({ variant }), className)} {...props} />;
};

type ContentProps = Omit<ToastContentProps, "className"> & ClassNameProp;

/*
 * Same panel treatment `Modal.Content` uses (`bg-bg-surface`/`rounded-lg`/`shadow-lg`, carried on
 * Root above so the danger border wraps the whole card) — Content itself only owns the internal
 * layout (UI-SPEC "Toast placement/behavior": no new visual tokens needed).
 */
const Content = ({ className, children, ...props }: ContentProps) => {
    return (
        <BaseToast.Content className={cn("flex flex-col gap-2 p-4", className)} {...props}>
            {children}
        </BaseToast.Content>
    );
};

type TitleProps = Omit<ToastTitleProps, "className"> & ClassNameProp;

/*
 * `line-clamp-2` caps a runaway title instead of letting the card grow (a hover-expand risks
 * overlapping the toast stacked below); the full text stays reachable via the native `title`
 * tooltip. `pr-6` reserves Close's icon footprint, verified via `getBoundingClientRect()` (see 02-07-SUMMARY.md).
 */
const Title = ({ className, children, ...props }: TitleProps) => {
    const tooltip = typeof children === "string" ? children : undefined;
    return (
        <BaseToast.Title
            title={tooltip}
            className={cn(
                "line-clamp-2 pr-6 font-body-m text-body-m [font-weight:var(--font-weight-body-m)] text-text-primary",
                className,
            )}
            {...props}
        >
            {children}
        </BaseToast.Title>
    );
};

type DescriptionProps = Omit<ToastDescriptionProps, "className"> & ClassNameProp;

/*
 * Same `line-clamp`/native-`title`-tooltip treatment as `Title` above, at three lines instead of
 * two. Also reserves the same `pr-6`, applied unconditionally rather than relying on Title always
 * being tall enough to clear the close icon's footprint on its own (see 02-07-SUMMARY.md).
 */
const Description = ({ className, children, ...props }: DescriptionProps) => {
    const tooltip = typeof children === "string" ? children : undefined;
    return (
        <BaseToast.Description
            title={tooltip}
            className={cn(
                "line-clamp-3 pr-6 font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-muted",
                className,
            )}
            {...props}
        >
            {children}
        </BaseToast.Description>
    );
};

type ActionProps = Omit<ToastActionProps, "className"> & ClassNameProp;

/*
 * `Toast.Action` renders nothing when it has no renderable content, so `ToastProvider` can render
 * it unconditionally with no guard. `-ml-2` cancels only `px-2`'s horizontal hit-area padding, so
 * the glyph stays flush-left with Title/Description above it (see 02-07-SUMMARY.md).
 */
const Action = ({ className, ...props }: ActionProps) => {
    return (
        <BaseToast.Action
            className={cn(
                "-ml-2 self-start rounded-sm px-2 py-1 font-body-m text-body-m [font-weight:var(--font-weight-body-m)] text-text-primary underline decoration-1 underline-offset-2 outline-none hover:no-underline focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2",
                className,
            )}
            {...props}
        />
    );
};

type CloseProps = Omit<ToastCloseProps, "className"> & ClassNameProp;

const Close = ({ className, ...props }: CloseProps) => {
    return (
        <BaseToast.Close
            aria-label="Dismiss notification"
            className={cn(
                "absolute top-2 right-2 inline-flex size-6 items-center justify-center rounded-sm text-text-muted transition-colors outline-none hover:bg-bg-app focus-visible:ring-2 focus-visible:ring-ring-focus focus-visible:ring-offset-2",
                className,
            )}
            {...props}
        >
            <X aria-hidden="true" className="size-4" />
        </BaseToast.Close>
    );
};

export const Toast = { Root, Content, Title, Description, Action, Close };

const ToastList = () => {
    const { toasts } = useToast();
    return (
        <>
            {toasts.map((toast) => (
                <Toast.Root key={toast.id} toast={toast}>
                    <Toast.Content>
                        <Toast.Title>{toast.title}</Toast.Title>

                        {toast.description ? <Toast.Description>{toast.description}</Toast.Description> : null}

                        <Toast.Action />
                    </Toast.Content>

                    <Toast.Close />
                </Toast.Root>
            ))}
        </>
    );
};

type ToastProviderProps = PropsWithChildren<Pick<BaseToastProviderProps, "limit" | "timeout" | "toastManager">>;

/*
 * Mounted once at the root layout, inside `QueryProvider`, since mutation hooks fire toasts from
 * `onError`/`onSuccess`. `toastManager` is forwarded, not consumed, so Storybook can inject a
 * pre-seeded manager (`toast.stories.tsx`); this file never calls that factory (see 02-07-SUMMARY.md).
 */
export const ToastProvider = ({ children, ...props }: ToastProviderProps) => {
    return (
        <BaseToast.Provider {...props}>
            {children}

            <BaseToast.Portal>
                <BaseToast.Viewport className="fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2 md:right-6 md:bottom-6 md:left-auto md:w-96">
                    <ToastList />
                </BaseToast.Viewport>
            </BaseToast.Portal>
        </BaseToast.Provider>
    );
};
