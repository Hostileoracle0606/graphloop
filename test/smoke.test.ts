import { expect, test } from "vitest";
import { LiveGraphEngine, merge, buildAgenda, InMemoryStorage, VERSION } from "../src/index";

test("public API is exported", () => {
  expect(typeof LiveGraphEngine).toBe("function");
  expect(typeof merge).toBe("function");
  expect(typeof buildAgenda).toBe("function");
  expect(typeof InMemoryStorage).toBe("function");
  expect(VERSION).toBe("0.1.0");
});
