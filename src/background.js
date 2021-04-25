const browser = chrome || browser;

const parsers = [
  (url) => {
    // TODO: use new URL and get query parameter and verify pathname
    const pattern = /^https:\/\/duckduckgo.com\/\?q=(?<q>.*)$/;
    const match = url.match(pattern);
    if (!match || !match.groups.q) {
      return null;
    }
    return {
      engine: "duckduckgo",
      query: match.groups.q.split("+").join(" "),
    };
  },
];

function getSearchQuery(url) {
  for (const parser of parsers) {
    const query = parser(url);
    if (query) {
      return query;
    }
  }
  return {};
}

const rules = [
  {
    operator: "!yt",
    redirectWithQuery: "https://www.youtube.com/results?search_query={}",
    redirectWithoutQuery: "https://www.youtube.com/",
  },
  {
    operator: "!qmk.keycodes",
    redirectWithoutQuery: "https://docs.qmk.fm/#/keycodes",
  },
];

function parseOp(query) {
  const pattern = /^(?<operator>![^ ]*) ?(?<operand>.*)$/;
  const match = query.match(pattern);
  if (!match) {
    return [];
  }
  const { operator, operand } = match.groups;
  return [operator, operand];
}

function applyRules(operator, operand) {
  for (const rule of rules) {
    if (rule.operator === operator) {
      if (operand && rule.redirectWithQuery) {
        return rule.redirectWithQuery.replace("{}", operand);
      }
      return rule.redirectWithoutQuery;
    }
  }
  return null;
}

browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    const { query } = getSearchQuery(details.url);
    if (!query) {
      return;
    }
    const [operator = "", operand = ""] = parseOp(query);
    const redirectUrl = applyRules(operator, operand);
    if (redirectUrl) {
      return {
        redirectUrl,
      };
    }
  },
  {
    types: ["main_frame"],
    urls: ["<all_urls>"],
  },
  ["blocking"]
);
