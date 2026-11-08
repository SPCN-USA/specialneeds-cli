#!/usr/bin/env node
import { createInterface } from 'node:readline';
import { parseArgs } from 'node:util';

const VERSION = '1.1.1';
const ENDPOINT = process.env.SPECIALNEEDS_MCP_URL || 'https://specialneedsusa.com/api/mcp';
const USER_AGENT = `specialneeds-cli/${VERSION}`;

const HELP = `specialneeds-cli ${VERSION}
Find special needs care for free, plus ABA therapy and IEP reference tools, from Special Needs Care Network.

Usage:
  specialneeds-cli find-care --care <type>   Get matched with care near you, for free
  specialneeds-cli cost <state>              ABA therapy cost and coverage for a US state
  specialneeds-cli iep-goals [search terms]  Search measurable example IEP goals
  specialneeds-cli iep-areas                 List IEP goal skill areas
  specialneeds-cli mcp                       Run as a local MCP server over stdio

Options for find-care:
  --care <type>       aba, school, speech, or diagnostic (repeat for more than one)
  --zip <zip>         5-digit ZIP code (this or --state is required)
  --state <state>     US state name or two-letter code
  --city <city>       City
  --age <years>       Age of the person who needs care
  --insurance <plan>  Insurance company or plan name, never a member number

Options for iep-goals:
  --area <id>     Limit to one skill area (see iep-areas)
  --autism        Only goals tagged for autistic students
  --limit <n>     Number of goals to show, 1 to 25 (default 10)

Global options:
  --json          Print raw JSON
  --version, -v   Print the version
  --help, -h      Show this help

Results are general information, not medical or legal advice.
https://specialneedsusa.com/tools/mcp
`;

async function post(url, message) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'User-Agent': USER_AGENT,
    },
    body: JSON.stringify(message),
  });
  if (response.status === 202) return null;
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Unexpected response from the server (HTTP ${response.status}).`);
  }
}

async function callTool(name, args) {
  const url = `${ENDPOINT}?client=cli`;
  const reply = await post(url, { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } });
  if (reply?.error) throw new Error(reply.error.message);
  if (reply.result.isError) throw new Error(reply.result.content[0].text);
  return reply.result.structuredContent;
}

function wrap(text, indent = '  ', width = Math.min(process.stdout.columns || 88, 100)) {
  const lines = [];
  let line = '';
  for (const word of String(text).split(/\s+/)) {
    if (line && indent.length + line.length + word.length + 1 > width) {
      lines.push(indent + line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(indent + line);
  return lines.join('\n');
}

function printCareMatch(data) {
  console.log(`\n${data.service}: ${data.cost_to_family}\n`);
  console.log(`${wrap(data.summary, '')}\n`);
  data.what_happens_next.forEach((step, index) => console.log(`${index + 1}. ${step}`));
  console.log(`\nConfirm your request (link works for ${data.link_expires_in_days} days):\n${data.confirm_url}\n`);
}

function printCost(data) {
  const mandate = data.insurance_mandate;
  console.log(`\nABA therapy cost in ${data.state}\n`);
  console.log(`Hourly, private pay:   ${data.typical_hourly_private_pay}`);
  console.log(`Intensive, per month:  ${data.intensive_monthly_before_insurance} before insurance`);
  console.log(`Insurance mandate:     ${mandate.strength}`);
  if (mandate.age_cap) console.log(`Age limit:             ${mandate.age_cap}`);
  if (mandate.annual_cap) console.log(`Annual cap:            ${mandate.annual_cap}`);
  console.log(`\nInsurance\n${wrap(data.insurance_notes)}`);
  console.log(`\nMedicaid\n${wrap(data.medicaid_access)}`);
  console.log(`\nWorth knowing\n${wrap(data.key_insight)}`);
  console.log(`\nFull calculator:  ${data.cost_calculator_url}`);
  console.log(`Find providers:   ${data.find_aba_providers_url}`);
  console.log(`\n${wrap(data.usage_note, '')}\n`);
}

function printGoals(data) {
  if (data.total_matches === 0) {
    console.log(`No goals matched. Run "specialneeds-cli iep-areas" to browse by skill area.\n${data.goal_bank_url}`);
    return;
  }
  console.log(`\nShowing ${data.returned} of ${data.total_matches} IEP goals\n`);
  for (const goal of data.goals) {
    console.log(`${goal.code}  ${goal.skill} (${goal.area_label})`);
    console.log(`${wrap(goal.text)}\n`);
  }
  console.log(wrap(data.usage_note, ''));
  console.log(`\nFull goal bank: ${data.goal_bank_url}\n`);
}

function printAreas(data) {
  console.log(`\n${data.total_goals} IEP goals across ${data.areas.length} skill areas\n`);
  for (const area of data.areas) {
    console.log(`${area.id.padEnd(22)} ${String(area.goal_count).padStart(2)} goals  ${area.label}`);
  }
  console.log('\nFilter with: specialneeds-cli iep-goals --area <id>\n');
}

// Relays newline-delimited JSON-RPC from an MCP client to the hosted server, in order.
async function runStdioBridge() {
  const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    let id = null;
    try {
      const message = JSON.parse(line);
      id = message.id ?? null;
      const reply = await post(ENDPOINT, message);
      if (reply) process.stdout.write(`${JSON.stringify(reply)}\n`);
    } catch (error) {
      process.stderr.write(`specialneeds-cli: ${error.message}\n`);
      if (id !== null) {
        const failure = { jsonrpc: '2.0', id, error: { code: -32603, message: 'Could not reach the server.' } };
        process.stdout.write(`${JSON.stringify(failure)}\n`);
      }
    }
  }
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      care: { type: 'string', multiple: true },
      zip: { type: 'string' },
      state: { type: 'string' },
      city: { type: 'string' },
      age: { type: 'string' },
      insurance: { type: 'string' },
      area: { type: 'string' },
      autism: { type: 'boolean', default: false },
      limit: { type: 'string' },
      json: { type: 'boolean', default: false },
      version: { type: 'boolean', short: 'v', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });

  if (values.version) return console.log(VERSION);
  const [command, ...rest] = positionals;
  if (values.help || !command) return console.log(HELP);

  const output = (data, print) => (values.json ? console.log(JSON.stringify(data, null, 2)) : print(data));

  switch (command) {
    case 'find-care': {
      if (!values.care?.length) throw new Error('Name the care you need, for example: specialneeds-cli find-care --care aba --zip 33602');
      const args = { care_types: values.care };
      for (const field of ['zip', 'state', 'city', 'insurance']) {
        if (values[field] !== undefined) args[field] = values[field];
      }
      if (values.age !== undefined) args.child_age = Number(values.age);
      return output(await callTool('find_special_needs_care', args), printCareMatch);
    }
    case 'cost': {
      const state = rest.join(' ').trim();
      if (!state) throw new Error('Name a state, for example: specialneeds-cli cost Texas');
      return output(await callTool('get_aba_therapy_cost', { state }), printCost);
    }
    case 'iep-goals': {
      const args = {};
      const query = rest.join(' ').trim();
      if (query) args.query = query;
      if (values.area) args.area = values.area;
      if (values.autism) args.autism_specific = true;
      if (values.limit !== undefined) args.limit = Number(values.limit);
      return output(await callTool('search_iep_goals', args), printGoals);
    }
    case 'iep-areas':
      return output(await callTool('list_iep_goal_areas', {}), printAreas);
    case 'mcp':
      return runStdioBridge();
    default:
      throw new Error(`Unknown command "${command}". Run specialneeds-cli --help.`);
  }
}

main().catch((error) => {
  console.error(`specialneeds-cli: ${error.message}`);
  process.exitCode = 1;
});
