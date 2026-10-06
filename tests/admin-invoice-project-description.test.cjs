const assert = require("node:assert/strict");
const test = require("node:test");
const express = require("express");
const { once } = require("node:events");
const Invoice = require("../src/models/invoice").default;
const { AdminController } = require("../src/controllers/adminController");
const adminRouter = require("../src/routes/admin").default;

const projectId = "507f1f77bcf86cd799439011";

function responseMock() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function invoiceMock(projectResult = {
  _id: projectId,
  projectName: "Website Refresh",
  projectDescription: "Update the public website",
}) {
  return {
    invoice_id: "INV-2026-001",
    amount: 100,
    status: "Pending",
    project_id: projectId,
    async populate(pathOrOptions) {
      if (typeof pathOrOptions === "object" && pathOrOptions.path === "project_id") {
        this.project_id = pathOrOptions.transform(projectResult, projectId);
      }
      return this;
    },
  };
}

function replaceMethod(target, name, replacement, context) {
  const descriptor = Object.getOwnPropertyDescriptor(target, name);
  target[name] = replacement;
  context.after(() => {
    if (descriptor) {
      Object.defineProperty(target, name, descriptor);
    } else {
      delete target[name];
    }
  });
}

test("admin single-invoice response contains project description and identifiers", async (context) => {
  const invoice = invoiceMock();
  replaceMethod(Invoice, "findOne", async () => invoice, context);

  const response = responseMock();
  await new AdminController().getInvoice(
    { body: { invoice_id: invoice.invoice_id }, params: {} },
    response,
  );

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.data.project_id, {
    _id: projectId,
    projectName: "Website Refresh",
    description: "Update the public website",
  });
});

test("admin invoice list response contains project description and identifiers", async (context) => {
  const invoice = invoiceMock();
  const query = {
    sort() {
      return this;
    },
    populate(pathOrOptions) {
      if (typeof pathOrOptions === "object" && pathOrOptions.path === "project_id") {
        invoice.project_id = pathOrOptions.transform(
          {
            _id: projectId,
            projectName: "Website Refresh",
            projectDescription: "Update the public website",
          },
          projectId,
        );
      }
      return this;
    },
    then(resolve, reject) {
      return Promise.resolve([invoice]).then(resolve, reject);
    },
  };
  replaceMethod(Invoice, "find", () => query, context);

  const response = responseMock();
  await new AdminController().listInvoices({ query: {} }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.data[0].project_id, {
    _id: projectId,
    projectName: "Website Refresh",
    description: "Update the public website",
  });
});

test("admin invoice detail handles a deleted project reference", async (context) => {
  const invoice = invoiceMock(null);
  replaceMethod(Invoice, "findOne", async () => invoice, context);

  const response = responseMock();
  await new AdminController().getInvoice(
    { body: { invoice_id: invoice.invoice_id }, params: {} },
    response,
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.data.project_id, null);
});

test("admin invoice route rejects requests without authentication", async (context) => {
  const app = express();
  app.use("/api/admin", adminRouter);
  const server = app.listen(0);
  context.after(() => new Promise((resolve) => server.close(resolve)));
  await once(server, "listening");

  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/admin/get-invoice`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ invoice_id: "INV-2026-001" }),
  });

  assert.equal(response.status, 401);
});