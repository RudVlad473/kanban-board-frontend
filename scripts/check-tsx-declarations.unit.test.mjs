import { describe, expect, it } from "vitest";

import { findTsxDeclarationViolations } from "./check-tsx-declarations.mjs";

const relativePath = "src/features/boards/components/example.tsx";

describe("findTsxDeclarationViolations", () => {
    it("flags a zod schema declared at top level, naming the identifier", () => {
        // Arrange
        const source = [
            'import { z } from "zod";',
            "",
            "const exampleSchema = z.object({ name: z.string() });",
            "",
            "type Props = { name: string };",
            "",
            "export const Example = ({ name }: Props) => <p>{name}</p>;",
        ].join("\n");

        // Act
        const violations = findTsxDeclarationViolations({ source, relativePath });

        // Assert
        expect(violations).toEqual([{ line: 3, name: "exampleSchema" }]);
    });

    it("reports none for a file declaring only an arrow-function component and a Props type alias", () => {
        // Arrange
        const source = [
            "type Props = { name: string };",
            "",
            "export const Example = ({ name }: Props) => {",
            "    return <p>{name}</p>;",
            "};",
        ].join("\n");

        // Act
        const violations = findTsxDeclarationViolations({ source, relativePath });

        // Assert
        expect(violations).toEqual([]);
    });

    it("reports none for a component wrapped in forwardRef or memo", () => {
        // Arrange
        const source = [
            'import { forwardRef, memo } from "react";',
            "",
            "type Props = { name: string };",
            "",
            "export const Example = forwardRef<HTMLParagraphElement, Props>((props, ref) => <p ref={ref} />);",
            "",
            "export const Memoized = memo(({ name }: Props) => <p>{name}</p>);",
        ].join("\n");

        // Act
        const violations = findTsxDeclarationViolations({ source, relativePath });

        // Assert
        expect(violations).toEqual([]);
    });

    it("reports none for a compound-component namespace object naming only components declared above it", () => {
        // Arrange
        const source = [
            "type RootProps = { children: string };",
            "",
            "const Root = ({ children }: RootProps) => <div>{children}</div>;",
            "",
            "const Content = ({ children }: RootProps) => <section>{children}</section>;",
            "",
            "export const Example = { Root, Content };",
        ].join("\n");

        // Act
        const violations = findTsxDeclarationViolations({ source, relativePath });

        // Assert
        expect(violations).toEqual([]);
    });

    it("flags an object literal whose property values are not components declared in this file", () => {
        // Arrange
        const source = [
            "type Props = { name: string };",
            "",
            "export const Example = ({ name }: Props) => <p>{name}</p>;",
            "",
            'export const SIZES = { small: "sm", large: "lg" };',
        ].join("\n");

        // Act
        const violations = findTsxDeclarationViolations({ source, relativePath });

        // Assert
        expect(violations).toEqual([{ line: 5, name: "SIZES" }]);
    });

    it("flags a namespace object naming a component declared below it, since the pattern closes a file", () => {
        // Arrange
        const source = [
            "type Props = { name: string };",
            "",
            "export const Example = { Root };",
            "",
            "const Root = ({ name }: Props) => <p>{name}</p>;",
        ].join("\n");

        // Act
        const violations = findTsxDeclarationViolations({ source, relativePath });

        // Assert
        expect(violations).toEqual([{ line: 3, name: "Example" }]);
    });

    it("reports none for a route file exporting Next.js framework-forced route-segment values", () => {
        // Arrange
        const source = [
            'import type { Metadata } from "next";',
            "",
            'export const metadata: Metadata = { title: "Kanban" };',
            'export const dynamic = "force-dynamic";',
            "",
            "const Layout = ({ children }: { children: React.ReactNode }) => <html>{children}</html>;",
            "",
            "export default Layout;",
        ].join("\n");

        // Act
        const violations = findTsxDeclarationViolations({ source, relativePath: "app/layout.tsx" });

        // Assert
        expect(violations).toEqual([]);
    });

    it("flags that same framework-forced name outside a route file, where nothing forces it", () => {
        // Arrange
        const source = ['export const metadata = { title: "Kanban" };'].join("\n");

        // Act
        const violations = findTsxDeclarationViolations({ source, relativePath });

        // Assert
        expect(violations).toEqual([{ line: 1, name: "metadata" }]);
    });

    it("reports none for anything under src/test-utils/, the ADR's only path exemption", () => {
        // Arrange
        const source = ["export const createShim = () => ({ push: () => undefined });"].join("\n");

        // Act
        const violations = findTsxDeclarationViolations({
            source,
            relativePath: "src/test-utils/next-router-shims.tsx",
        });

        // Assert
        expect(violations).toEqual([]);
    });

    it("flags a styling constant and a non-component helper function together", () => {
        // Arrange
        const source = [
            'import { cva } from "class-variance-authority";',
            "",
            'const exampleVariants = cva("rounded");',
            "",
            "const readValue = (input: string): string => input.trim();",
            "",
            "type Props = { name: string };",
            "",
            "export const Example = ({ name }: Props) => <p>{name}</p>;",
        ].join("\n");

        // Act
        const violations = findTsxDeclarationViolations({ source, relativePath });

        // Assert
        expect(violations).toEqual([
            { line: 3, name: "exampleVariants" },
            { line: 5, name: "readValue" },
        ]);
    });
});
