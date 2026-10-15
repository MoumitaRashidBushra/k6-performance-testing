import { check, sleep } from "k6";
import exec from "k6/execution";
import http from "k6/http";

const BASE_URL = (__ENV.BASE_URL || "http://localhost:5000").replace(
  /\/+$/,
  "",
);
const OTP = __ENV.OTP || "0000";
const PARTNER_KEY = __ENV.PARTNER_KEY || "ROADTOSDET";
const PHASE_DURATION = "30s";

const users = {
  agent1: {
    email: "moumitarashidsv+a1@gmail.com",
    password: "1234",
    phone: "01815653738",
  },
  agent2: {
    email: "moumitarashidsv+a2@gmail.com",
    password: "1234",
    phone: "01815653838",
  },
  customer1: {
    email: "moumitarashidsv+c1@gmail.com",
    password: "1234",
    phone: "01815653438",
  },
  customer2: {
    email: "moumitarashidsv+c2@gmail.com",
    password: "1234",
    phone: "01815653538",
  },
  merchant1: {
    email: "moumitarashidsv+m1@gmail.com",
    password: "1234",
    phone: "01815653238",
  },
  merchant2: {
    email: "moumitarashidsv+m2@gmail.com",
    password: "1234",
    phone: "01815653338",
  },
};

const flows = {
  p0_customer1_send_customer2: {
    startTime: "0s",
    phase: "0-30s",
    api: "sendmoney",
    from: "customer1",
    to: "customer2",
    amount: 10,
  },
  p0_customer2_pay_merchant1: {
    startTime: "0s",
    phase: "0-30s",
    api: "payment",
    from: "customer2",
    to: "merchant1",
    amount: 10,
  },
  p1_customer2_send_customer1: {
    startTime: "30s",
    phase: "30-60s",
    api: "sendmoney",
    from: "customer2",
    to: "customer1",
    amount: 10,
  },
  p1_agent1_deposit_customer2: {
    startTime: "30s",
    phase: "30-60s",
    api: "deposit",
    from: "agent1",
    to: "customer2",
    amount: 10,
  },
  p1_customer1_pay_merchant1: {
    startTime: "30s",
    phase: "30-60s",
    api: "payment",
    from: "customer1",
    to: "merchant1",
    amount: 10,
  },
  p2_agent1_deposit_customer1: {
    startTime: "60s",
    phase: "60-90s",
    api: "deposit",
    from: "agent1",
    to: "customer1",
    amount: 10,
  },
  p2_agent2_deposit_customer2: {
    startTime: "60s",
    phase: "60-90s",
    api: "deposit",
    from: "agent2",
    to: "customer2",
    amount: 10,
  },
  p2_customer1_send_customer2: {
    startTime: "60s",
    phase: "60-90s",
    api: "sendmoney",
    from: "customer1",
    to: "customer2",
    amount: 10,
  },
  p2_customer2_pay_merchant2: {
    startTime: "60s",
    phase: "60-90s",
    api: "payment",
    from: "customer2",
    to: "merchant2",
    amount: 10,
  },
  p3_agent1_pay_merchant1: {
    startTime: "90s",
    phase: "90-120s",
    api: "payment",
    from: "agent1",
    to: "merchant1",
    amount: 10,
  },
  p3_agent2_pay_merchant2: {
    startTime: "90s",
    phase: "90-120s",
    api: "payment",
    from: "agent2",
    to: "merchant2",
    amount: 10,
  },
  p3_customer1_pay_merchant1: {
    startTime: "90s",
    phase: "90-120s",
    api: "payment",
    from: "customer1",
    to: "merchant1",
    amount: 10,
  },
  p3_customer2_pay_merchant2: {
    startTime: "90s",
    phase: "90-120s",
    api: "payment",
    from: "customer2",
    to: "merchant2",
    amount: 10,
  },
};

const scenarios = {};

for (const [name, flow] of Object.entries(flows)) {
  scenarios[name] = {
    executor: "constant-vus",
    vus: 1,
    duration: PHASE_DURATION,
    startTime: flow.startTime,
    gracefulStop: "5s",
    exec: "runFlow",
  };
}

const phaseThresholds = {};

for (const flow of Object.values(flows)) {
  const selector = `{api:${flow.api},phase:${flow.phase}}`;

  phaseThresholds[`http_req_failed${selector}`] = ["rate<0.01"];
  phaseThresholds[`http_req_duration${selector}`] = ["p(95)<1000"];
  phaseThresholds[`http_reqs${selector}`] = ["count>0"];
  phaseThresholds[`checks${selector}`] = ["rate>0.99"];
}

export const options = {
  scenarios,
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1000"],
    checks: ["rate>0.99"],

    "http_req_failed{api:deposit}": ["rate<0.01"],
    "http_req_duration{api:deposit}": ["p(95)<1000"],
    "checks{api:deposit}": ["rate>0.99"],

    "http_req_failed{api:sendmoney}": ["rate<0.01"],
    "http_req_duration{api:sendmoney}": ["p(95)<1000"],
    "checks{api:sendmoney}": ["rate>0.99"],

    "http_req_failed{api:payment}": ["rate<0.01"],
    "http_req_duration{api:payment}": ["p(95)<1000"],
    "checks{api:payment}": ["rate>0.99"],

    ...phaseThresholds,
  },
};

const expectedMessages = {
  deposit: "Deposit successful",
  sendmoney: "Send money successful",
  payment: "Payment successful",
};

function parseJson(response) {
  try {
    return response.json();
  } catch (_) {
    return {};
  }
}

function getToken(response) {
  const body = parseJson(response);

  if (body.token) return body.token;
  if (body.accessToken) return body.accessToken;
  if (body.data?.token) return body.data.token;
  if (body.data?.accessToken) return body.data.accessToken;

  return null;
}

export function setup() {
  const authenticatedUsers = {};
  const runId = `k6-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  for (const [role, user] of Object.entries(users)) {
    const loginResponse = http.post(
      `${BASE_URL}/user/login?env=dev`,
      JSON.stringify({
        email: user.email,
        password: user.password,
      }),
      {
        headers: { "Content-Type": "application/json" },
        tags: { name: "login", role },
      },
    );

    if (loginResponse.status < 200 || loginResponse.status >= 300) {
      throw new Error(
        `Login failed for ${role}: HTTP ${loginResponse.status}.`,
      );
    }

    const loginToken = getToken(loginResponse);

    const verifyResponse = http.post(
      `${BASE_URL}/user/verify-otp?env=dev`,
      JSON.stringify({
        identifier: user.email,
        otp: OTP,
      }),
      {
        headers: { "Content-Type": "application/json" },
        tags: { name: "verify-otp", role },
      },
    );

    if (verifyResponse.status < 200 || verifyResponse.status >= 300) {
      throw new Error(
        `OTP verification failed for ${role}: HTTP ${verifyResponse.status}.`,
      );
    }

    const verifiedToken = getToken(verifyResponse);
    const token = verifiedToken || loginToken;

    if (!token) {
      throw new Error(`No authentication token returned for ${role}.`);
    }

    authenticatedUsers[role] = {
      ...user,
      token,
    };
  }

  return { users: authenticatedUsers, runId };
}

export function runFlow(data) {
  const scenarioName = exec.scenario.name;
  const flow = flows[scenarioName];

  if (!flow) {
    throw new Error(
      `No flow configuration found for scenario: ${scenarioName}`,
    );
  }
  const sender = data.users[flow.from];
  const receiver = data.users[flow.to];

  const tags = {
    api: flow.api,
    phase: flow.phase,
  };

  const payload = JSON.stringify({
    from_account: sender.phone,
    to_account: receiver.phone,
    amount: flow.amount,
  });

  const response = http.post(`${BASE_URL}/transaction/${flow.api}`, payload, {
    headers: {
      Authorization: `Bearer ${sender.token}`,
      "X-AUTH-SECRET-KEY": PARTNER_KEY,
      "X-K6-Run-ID": data.runId,
      "Content-Type": "application/json",
    },
    tags,
    responseCallback: http.expectedStatuses(201),
    timeout: "5s",
  });

  const body = parseJson(response);

  if (response.status !== 201) {
    console.error(
      `[${scenarioName}] HTTP ${response.status}: ${response.body}`,
    );
  }

  check(
    response,
    {
      "transaction status is 201": (r) => r.status === 201,
      "transaction succeeded": (r) =>
        r.status === 201 && body.message === expectedMessages[flow.api],
      "transaction ID is returned": () =>
        typeof body.trnxId === "string" && body.trnxId.length > 0,
      "expected success message is returned": () =>
        body.message === expectedMessages[flow.api],
    },
    tags,
  );

  sleep(1);
}

export function teardown(data) {
  const agent = data.users.agent1;
  const response = http.del(
    `${BASE_URL}/transaction/test-run/${encodeURIComponent(data.runId)}`,
    null,
    {
      headers: {
        Authorization: `Bearer ${agent.token}`,
        "X-AUTH-SECRET-KEY": PARTNER_KEY,
      },
      tags: { name: "k6-cleanup" },
      timeout: "10s",
    },
  );

  if (response.status !== 200) {
    throw new Error(
      `k6 cleanup failed: HTTP ${response.status} ${response.body}`,
    );
  }
}

function findMetricValues(data, metricName, api, phase) {
  const requiredTags = [`api:${api}`];
  if (phase) requiredTags.push(`phase:${phase}`);

  const entry = Object.entries(data.metrics || {}).find(
    ([name]) =>
      name.startsWith(`${metricName}{`) &&
      requiredTags.every((tag) => name.includes(tag)),
  );

  return entry ? entry[1].values : null;
}

function formatMetric(value, suffix = "") {
  return Number.isFinite(value) ? `${value.toFixed(2)}${suffix}` : "n/a";
}

function formatChange(value) {
  if (!Number.isFinite(value)) return "n/a";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export function handleSummary(data) {
  const phases = ["0-30s", "30-60s", "60-90s", "90-120s"];
  const apiNames = ["deposit", "sendmoney", "payment"];
  const report = [
    "DMoney API performance by active phase",
    `${"API".padEnd(9)} ${"Phase".padEnd(8)} ${"Requests".padEnd(9)} ` +
      `${"Throughput".padEnd(11)} ${"Avg (ms)".padEnd(9)} ${"p95 (ms)".padEnd(9)} ` +
      `${"p95 change".padEnd(12)} ${"Failed".padEnd(7)} Checks`,
  ];
  const phaseResults = [];

  for (const api of apiNames) {
    const results = [];

    for (const phase of phases) {
      const requests = findMetricValues(data, "http_reqs", api, phase);
      const count = requests?.count || 0;
      if (count === 0) continue;

      const duration = findMetricValues(data, "http_req_duration", api, phase);
      const failures = findMetricValues(data, "http_req_failed", api, phase);
      const checks = findMetricValues(data, "checks", api, phase);
      const p95 = duration?.["p(95)"];
      const previousResult = results[results.length - 1];
      const p95Change =
        previousResult &&
        Number.isFinite(previousResult.p95) &&
        previousResult.p95 > 0 &&
        Number.isFinite(p95)
          ? ((p95 - previousResult.p95) / previousResult.p95) * 100
          : null;
      const result = {
        phase,
        requests: count,
        throughput: count / 30,
        avg: duration?.avg,
        p95,
        p95Change,
        failedRate: failures?.rate,
        checksRate: checks?.rate,
      };

      results.push(result);
      phaseResults.push({ api, ...result });
      report.push(
        `${api.padEnd(9)} ${phase.padEnd(8)} ${String(count).padEnd(9)} ` +
          `${formatMetric(result.throughput, " req/s").padEnd(11)} ` +
          `${formatMetric(result.avg).padEnd(9)} ` +
          `${formatMetric(result.p95).padEnd(9)} ` +
          `${(result.p95Change === null ? "baseline" : formatChange(result.p95Change)).padEnd(12)} ` +
          `${formatMetric(result.failedRate * 100, "%").padEnd(7)} ` +
          `${formatMetric(result.checksRate * 100, "%")}`,
      );
    }

    if (results.length > 0) {
      const firstP95 = results[0].p95;
      const lastP95 = results[results.length - 1].p95;
      const degradation =
        Number.isFinite(firstP95) && firstP95 > 0 && Number.isFinite(lastP95)
          ? ((lastP95 - firstP95) / firstP95) * 100
          : null;

      report.push(
        `${api} p95 change (first to last active phase): ${formatChange(degradation)}`,
      );
    }
  }

  const thresholdResults = Object.entries(data.metrics || {}).flatMap(
    ([metricName, metric]) =>
      Object.entries(metric.thresholds || {}).map(([expression, result]) => ({
        metricName,
        expression,
        passed: typeof result === "boolean" ? result : result?.ok === true,
      })),
  );
  const failedThresholds = thresholdResults.filter(({ passed }) => !passed);
  const passedThresholdCount =
    thresholdResults.length - failedThresholds.length;

  if (thresholdResults.length === 0) {
    report.push(
      "Threshold status: unavailable (k6 returned no threshold results).",
    );
  } else {
    report.push(
      `Threshold status: ${failedThresholds.length === 0 ? "PASS" : "FAIL"} ` +
        `(${passedThresholdCount}/${thresholdResults.length} passed).`,
    );
    for (const { metricName, expression } of failedThresholds) {
      report.push(`  FAIL ${metricName}: ${expression}`);
    }
  }

  report.push(
    "Threshold targets: failed < 1%, p95 < 1000 ms, checks > 99%.",
    "Phase p95 change is relative to the previous active phase; positive means slower, negative means faster.",
    "Throughput is calculated as phase request count / 30 seconds.",
  );

  const thresholdStatus =
    thresholdResults.length === 0
      ? "UNAVAILABLE"
      : failedThresholds.length === 0
        ? "PASS"
        : "FAIL";
  const phaseRows = phaseResults
    .map((result) => {
      const changeClass =
        result.p95Change > 0
          ? "slower"
          : result.p95Change < 0
            ? "faster"
            : "neutral";

      return `<tr>
        <td>${escapeHtml(result.api)}</td>
        <td>${escapeHtml(result.phase)}</td>
        <td>${result.requests}</td>
        <td>${formatMetric(result.throughput, " req/s")}</td>
        <td>${formatMetric(result.avg)}</td>
        <td>${formatMetric(result.p95)}</td>
        <td class="${changeClass}">${result.p95Change === null ? "baseline" : formatChange(result.p95Change)}</td>
        <td>${formatMetric(result.failedRate * 100, "%")}</td>
        <td>${formatMetric(result.checksRate * 100, "%")}</td>
      </tr>`;
    })
    .join("\n");
  const thresholdRows = thresholdResults
    .map(
      ({ metricName, expression, passed }) => `<tr>
        <td>${escapeHtml(metricName)}</td>
        <td><code>${escapeHtml(expression)}</code></td>
        <td class="${passed ? "pass" : "fail"}">${passed ? "PASS" : "FAIL"}</td>
      </tr>`,
    )
    .join("\n");
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DMoney API Performance Report</title>
  <style>
    :root { color-scheme: light; font-family: "Segoe UI", sans-serif; color: #202a33; background: #f3f6f5; }
    body { max-width: 1200px; margin: 0 auto; padding: 32px 20px; }
    h1 { margin: 0; font-size: 28px; }
    h2 { margin: 32px 0 12px; font-size: 19px; }
    .eyebrow { color: #376b5b; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .status { display: inline-block; margin-top: 14px; padding: 7px 11px; border-radius: 4px; font-weight: 700; }
    .status.PASS, .pass { color: #17643b; background: #e5f4eb; }
    .status.FAIL, .fail { color: #9d2929; background: #fbe9e7; }
    .status.UNAVAILABLE { color: #66550d; background: #fff5cf; }
    .table-wrap { overflow-x: auto; border: 1px solid #d7dfdc; background: #fff; }
    table { width: 100%; border-collapse: collapse; text-align: left; white-space: nowrap; }
    th, td { padding: 10px 12px; border-bottom: 1px solid #e7ecea; }
    th { background: #eaf0ed; font-size: 12px; }
    tbody tr:last-child td { border-bottom: 0; }
    .slower { color: #a33a2b; font-weight: 700; }
    .faster { color: #17643b; font-weight: 700; }
    .neutral { color: #5b6570; }
    .note, footer { color: #5b6570; font-size: 13px; }
    code { font-size: 12px; }
    @media print { :root { background: #fff; } body { max-width: none; padding: 0; } .table-wrap { overflow: visible; } }
  </style>
</head>
<body>
  <header>
    <div class="eyebrow">k6 performance test</div>
    <h1>DMoney API Performance Report</h1>
    <div class="status ${thresholdStatus}">Thresholds: ${thresholdStatus} (${passedThresholdCount}/${thresholdResults.length} passed)</div>
  </header>
  <main>
    <section>
      <h2>Results by active phase</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>API</th><th>Phase</th><th>Requests</th><th>Throughput</th><th>Avg (ms)</th><th>p95 (ms)</th><th>p95 change</th><th>Failed</th><th>Checks</th></tr></thead>
          <tbody>${phaseRows || '<tr><td colspan="9">No transaction metrics available.</td></tr>'}</tbody>
        </table>
      </div>
      <p class="note">p95 change is relative to the previous active phase. Positive means slower; negative means faster. Throughput is requests divided by the 30-second phase.</p>
    </section>
    <section>
      <h2>Threshold results</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Metric</th><th>Threshold</th><th>Result</th></tr></thead>
          <tbody>${thresholdRows || '<tr><td colspan="3">No threshold results returned by k6.</td></tr>'}</tbody>
        </table>
      </div>
      <p class="note">Targets: failed request rate &lt; 1%, p95 response time &lt; 1000 ms, checks &gt; 99%.</p>
    </section>
  </main>
  <footer>Generated by k6 from dmoney-performance.js.</footer>
</body>
</html>
`;

  return {
    stdout: `${report.join("\n")}\n`,
    "report/dmoney-performance-report.html": html,
  };
}
