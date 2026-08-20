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
 * D-04/D-09/D-15: a component anywhere in the tree raises a toast via `useToast().add(...)`
 * (re-exported below) — no portal, timer or ARIA-live wiring of its own. `useToastManager()`
 * reads `Toast.Provider`'s own per-render-tree store (established once, here, at the root
 * layout), the same reasoning `query-client.tsx` already documents for `QueryClient`: a
 * module-scope manager instance, built via Base UI's sibling factory export, would be shared
 * across every concurrent SSR request, leaking one user's toasts into another's response — see
 * `ToastProvider`'s own comment below for where that factory IS deliberately used, and why that
 * context doesn't carry the same hazard. `add`/`close`/`update` are re-exported whole (not
 * narrowed to `add`) — plan 02-10's D-04 retry closes/updates a toast by its stable id rather
 * than stacking a second one.
 */
export const useToast = BaseToast.useToastManager;

/*
 * The danger accent is read from `toast.type` (set by the caller via `add({ type: "danger" })`)
 * rather than a separate `variant` prop threaded onto this wrapper — Base UI's own `ToastObject`
 * already carries `type` "to conditionally style the toast" (installed d.ts) and stamps it onto
 * the rendered element as `data-type`; adding a second prop would just duplicate state the
 * manager already owns. `relative` supports Close's `absolute` positioning below.
 *
 * `rounded-sm` (radius.sm, 4px) matches TextField/Dropdown's trigger radius, per human review —
 * NOT Modal's `rounded-lg` (28px) this card's surface treatment otherwise borrows
 * (`bg-bg-surface`/`shadow-lg` below still match Modal.Content; only the corner radius doesn't).
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
 * `line-clamp-2` caps a runaway title at two lines (`overflow-hidden` + the `-webkit-line-clamp`
 * ellipsis it sets) rather than letting the card keep growing taller — per human review, a
 * CSS hover-expand was rejected because it risks the expanded card overlapping the toast stacked
 * below it (Stacked story). The full, untruncated text is still reachable via the native `title`
 * attribute (a real browser tooltip on hover/focus), the simplest option that can't overlap
 * anything. Only wired when `children` is a plain string — a consumer passing rich JSX children is
 * responsible for its own tooltip, same as any other primitive's `title` escape hatch.
 */
const Title = ({ className, children, ...props }: TitleProps) => {
    const tooltip = typeof children === "string" ? children : undefined;
    return (
        <BaseToast.Title
            title={tooltip}
            className={cn(
                "line-clamp-2 font-body-m text-body-m [font-weight:var(--font-weight-body-m)] text-text-primary",
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
 * two — a description is expected to run longer than a title before it needs capping.
 */
const Description = ({ className, children, ...props }: DescriptionProps) => {
    const tooltip = typeof children === "string" ? children : undefined;
    return (
        <BaseToast.Description
            title={tooltip}
            className={cn(
                "line-clamp-3 font-body-l text-body-l [font-weight:var(--font-weight-body-l)] text-text-muted",
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
 * `Toast.Action` (Base UI) reads `toast.actionProps` from its enclosing `Toast.Root` context on
 * its own and renders nothing when neither `actionProps` nor `children` resolve to a renderable
 * node (installed source, `hasRenderableChildren`) — so `ToastProvider` below can render this
 * unconditionally for every toast without an `if (toast.actionProps)` guard of its own.
 *
 * `px-2` widens the click/hover target beyond the visible "Retry" glyph, which is correct for a
 * comfortable hit area — but left unchecked it also shifts the glyph itself ~8px right of
 * Title/Description's shared left edge (`Content`'s own `p-4`, no extra horizontal inset of its
 * own), a visible misalignment human review caught. `-ml-2` cancels only the horizontal offset
 * (not `py-1`, which doesn't shift anything horizontally) so the hit area keeps its full padded
 * size while the rendered text lines up flush-left with the title and description above it.
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
 * Mounted once at the root layout, inside `QueryProvider` — mutation hooks fire toasts from
 * `onError`/`onSuccess`, so the toast context must be reachable from inside the query context's
 * subtree. `toastManager` is forwarded (not consumed) so callers outside this app's own runtime
 * — Storybook stories, which are not the concurrent-SSR-request context the module-scope hazard
 * above applies to — can inject a pre-seeded manager built with Base UI's manager-factory export
 * (`toast.stories.tsx` is the one place in this plan that calls it); this file never does.
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
