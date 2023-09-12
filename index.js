import "@logseq/libs";
import axios from "axios";

const settingsTemplate = [
  {
    key: "keyboard",
    type: "string",
    default: "r n",
    description:
      'Type in the key or key combination you wish to use to toggle. If you want multiple key combinations, add a space or "+" between the keys ("r n" or "ctrl+r"). \n\rIMPORTANT: After changing the hotkey, you must restart Logseq to take effect.',
    title: "Keyboard Hotkey",
  },
  {
    key: "randomMode",
    type: "enum",
    default: "page",
    title: "Random Mode",
    description: "Page, card, tags or advanced query",
    enumChoices: ["page", "card", "tags", "query"],
    enumPicker: "radio",
  },
  {
    key: "includeJournals",
    type: "boolean",
    default: false,
    title: "Page mode",
    description: "Include Journals?",
  },
  {
    key: "randomTags",
    type: "string",
    default: "",
    title: "Tags mode",
    description: "Comma separated the tags. e.g. programing,design,sports",
  },
  {
    key: "advancedQuery",
    type: "string",
    default: "",
    title: "Query mode",
    inputAs: "textarea",
    description:
      'Your custom query. e.g. [:find (pull ?b [*]) :where [?b :block/refs ?bp] [?bp :block/name "book"]]',
  },
  {
    key: "randomStepSize",
    type: "enum",
    default: "1",
    title: "Random walk step size.",
    description:
      "Random walk step size. Use it with caution. One shows in main area, others show in the right sidebar.",
    enumChoices: ["1", "3", "5", "7", "10"],
    enumPicker: "radio",
  },
  {
    key: "enableTelegramBot",
    title: "Enable telegram bot",
    description: "Enable telegram bot. It doesn't work in page mode.",
    type: "boolean",
    default: false,
  },
  {
    key: "telegramBotToken",
    type: "string",
    default: "",
    title: "Telegram bot token",
    description: "",
  },
  {
    key: "telegramBotChatId",
    type: "string",
    default: "",
    title: "Telegram bot chatId",
    description: "",
  },
  {
    key: "activeHours",
    title: "Telegram bot active hours",
    type: "enum",
    enumChoices: Array.from({ length: 24 }, (_, i) => i + ""),
    enumPicker: "checkbox",
    default: [],
    description: "",
  },
  {
    key: "activeMinutes",
    title: "Telegram bot active minutes",
    type: "enum",
    enumChoices: Array.from({ length: 60 }, (_, i) => i + ""),
    enumPicker: "checkbox",
    default: ["0"],
    description: "",
  },
];

logseq.useSettingsSchema(settingsTemplate);

// From http://baagoe.com/en/RandomMusings/javascript/
// Johannes Baagøe <baagoe@baagoe.com>, 2010
function Mash() {
  var n = 0xefc8249d;

  var mash = function(data) {
    data = data.toString();
    for (var i = 0; i < data.length; i++) {
      n += data.charCodeAt(i);
      var h = 0.02519603282416938 * n;
      n = h >>> 0;
      h -= n;
      h *= n;
      n = h >>> 0;
      h -= n;
      n += h * 0x100000000; // 2^32
    }
    return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
  };

  mash.version = 'Mash 0.9';
  return mash;
}

// From http://baagoe.com/en/RandomMusings/javascript/
function Xorshift03() {
  return (function(args) {
    // George Marsaglia, 13 May 2003
    // http://groups.google.com/group/comp.lang.c/msg/e3c4ea1169e463ae
    var x = 123456789,
        y = 362436069,
        z = 521288629,
        w = 88675123,
        v = 886756453;

    if (args.length == 0) {
      args = [+new Date];
    }
    var mash = Mash();
    for (var i = 0; i < args.length; i++) {
      x ^= mash(args[i]) * 0x100000000; // 2^32
      y ^= mash(args[i]) * 0x100000000;
      z ^= mash(args[i]) * 0x100000000;
      v ^= mash(args[i]) * 0x100000000;
      w ^= mash(args[i]) * 0x100000000;
    }
    mash = null;

    var uint32 = function() {
      var t = (x ^ (x >>> 7)) >>> 0;
      x = y;
      y = z;
      z = w;
      w = v;
      v = (v ^ (v << 6)) ^ (t ^ (t << 13)) >>> 0;
      return ((y + y + 1) * v) >>> 0;
    }

    var random = function() {
      return uint32() * 2.3283064365386963e-10; // 2^-32
    };
    random.uint32 = uint32;
    random.fract53 = function() {
      return random() +
        (uint32() & 0x1fffff) * 1.1102230246251565e-16; // 2^-53
    };
    random.version = 'Xorshift03 0.9';
    random.args = args;
    return random;

  } (Array.prototype.slice.call(arguments)));
};

var random = Xorshift03();

async function openRandomNote() {
  const queryScript = getQueryScript();
  let stepSize = parseInt(logseq.settings.randomStepSize || 1);
  try {
    let ret = await logseq.DB.datascriptQuery(queryScript);
    const pages = ret?.flat();
    for (let i = 0; i < pages.length; i++) {
      const block = pages[i];
      if (block["pre-block?"]) {
        pages[i] = await logseq.Editor.getPage(block.page.id);
      }
    }
    openRandomNoteInMain(pages);
    if (stepSize > 1) {
      openRandomNoteInSidebar(pages, stepSize - 1);
    }
  } catch (err) {
    logseq.UI.showMsg(
      err.message || "Maybe something wrong with the query",
      "error"
    );
    console.log(err);
  }
}

/**
 * open random note in main area.
 * @param {*} pages
 */
async function openRandomNoteInMain(pages) {
  if (pages && pages.length > 0) {
    const index = Math.floor(random() * pages.length);
    const page = pages[index];
    if (page && page.name) {
      logseq.App.pushState("page", { name: page.name });
    } else if (page && page.page) {
      const blockInfo = (await logseq.Editor.getBlock(page.id)) || {
        uuid: "",
      };
      logseq.App.pushState("page", { name: blockInfo.uuid });
    }
  }
}

/**
 * open random notes in right sidebar.
 * @param {*} pages
 * @param {*} counts
 */
async function openRandomNoteInSidebar(pages, counts) {
  for (var i = 0; i < counts; i++) {
    const index = Math.floor(random() * pages.length);
    const page = pages[index];
    logseq.Editor.openInRightSidebar(page.uuid);
  }
}

/**
 * 发送消息到telegram bot
 * @param {*} msg
 */
async function sendToTelegramBot(msg) {
  const token = logseq.settings.telegramBotToken;
  const chatId = logseq.settings.telegramBotChatId;
  const sendUrl =
    "https://api.telegram.org/bot" +
    token +
    "/sendMessage?chat_id=" +
    chatId +
    "&text=" +
    encodeURIComponent(msg);
  if (token && chatId) {
    axios
      .get(sendUrl)
      .then((res) => {
        console.log(res);
      })
      .catch((err) => {
        console.log(err);
      });
  }
}

function getQueryScript() {
  const randomMode = logseq.settings.randomMode;
  const includeJournals = logseq.settings.includeJournals;
  const randomTags = logseq.settings.randomTags.split(",");
  const defaultQuery = `
  [:find (pull ?p [*])
    :where
    [?p :block/name _]]`;
  switch (randomMode) {
    case "page":
      if (includeJournals) {
        return `
        [:find (pull ?p [*])
          :where
          [?p :block/name _]]`;
      } else {
        return `
        [:find (pull ?p [*])
          :where
          [?p :block/journal? false]]`;
      }
    case "tags":
      const tags = randomTags
        .map((item) => '"' + item.toLowerCase() + '"')
        .join(",");
      if (!logseq.settings.randomTags) {
        logseq.UI.showMsg("Random tags are required.", "warning");
      }
      return (
        `
      [:find (pull ?b [*])
        :where
        [?b :block/refs ?bp]
        [?bp :block/name ?name]
        [(contains? #{` +
        tags +
        `} ?name)]]
      `
      );
    case "card":
      return `
        [:find (pull ?b [*])
          :where
          [?b :block/refs ?bp]
          [?bp :block/name ?name]
          [(contains? #{"card"} ?name)]]
        `;
    case "query":
      return logseq.settings.advancedQuery;
    default:
      console.log("unknown");
      return defaultQuery;
  }
}

async function getRandomNoteInfo() {
  const queryScript = getQueryScript();
  const ret = await logseq.DB.datascriptQuery(queryScript);
  const blocks = ret?.flat();
  if (blocks && blocks.length > 0) {
    const index = Math.floor(random() * blocks.length);
    const randomNoteInfo = await getBlockReadableContent(blocks[index].uuid);
    console.log("randomNoteInfo=" + randomNoteInfo);
    return randomNoteInfo;
  }
  return "";
}

async function getBlockReadableContent(uid) {
  const blockInfo = await logseq.Editor.getBlock(uid);
  console.log(blockInfo);
  console.log("before replace =>", blockInfo?.content);
  const content =
    blockInfo?.content.split(/\n.*::/)[0].replace("/\n.*::/", "") || "";
  console.log("after replace =>", content);
  if (hasRefUuid(content)) {
    const parts = content.split("))");
    const childContent = await getBlockReadableContent(
      parts[0].replace("((", "")
    );
    return childContent + parts[1];
  }
  return content;
}

const hasRefUuid = (content) => {
  return !!content && content.indexOf("((") > -1 && content.indexOf("))") > -1;
};

function main() {
  logseq.provideModel({
    handleRandomNote() {
      openRandomNote();
    },
  });

  logseq.App.registerUIItem("toolbar", {
    key: "logseq-random-note-toolbar",
    template: `
      <span class="logseq-random-note-toolbar">
        <a title="I'm Feeling Lucky(r n)" class="button" data-on-click="handleRandomNote">
          <i class="ti ti-windmill"></i>
        </a>
      </span>
    `,
  });

  logseq.App.registerCommandPalette(
    {
      key: "logseq-random-note",
      label: "Random note => Let's go",
      keybinding: {
        mode: "non-editing",
        binding: logseq.settings.keyboard || "r n",
      },
    },
    () => {
      openRandomNote();
    }
  );

  logseq.App.registerCommandPalette(
    {
      key: "logseq-random-note:page-mode",
      label: "Random note => page mode",
    },
    () => {
      logseq.updateSettings({ randomMode: "page" });
    }
  );
  logseq.App.registerCommandPalette(
    {
      key: "logseq-random-note:tags-mode",
      label: "Random note => tags mode",
    },
    () => {
      logseq.updateSettings({ randomMode: "tags" });
    }
  );
  logseq.App.registerCommandPalette(
    {
      key: "logseq-random-note:card-mode",
      label: "Random note => card mode",
    },
    () => {
      logseq.updateSettings({ randomMode: "card" });
    }
  );
  logseq.App.registerCommandPalette(
    {
      key: "logseq-random-note:query-mode",
      label: "Random note => query mode",
    },
    () => {
      logseq.updateSettings({ randomMode: "query" });
    }
  );

  logseq.App.registerCommandPalette(
    {
      key: "logseq-random-note:toggle-telegram-bot",
      label: "Random note => Toggle Telegram Bot",
    },
    () => {
      const enable = logseq.settings.enableTelegramBot;
      logseq.updateSettings({ enableTelegramBot: !enable });
      logseq.UI.showMsg(
        "RandomNote Telegram Bot " + (enable ? "Disabled" : "Enabled"),
        "success"
      );
    }
  );

  const sendContentInterval = setInterval(() => {
    console.log("sendContentInterval running...");
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    console.log("hour: " + hour + " minute: " + minute);
    const activeHours = logseq.settings.activeHours;
    const activeMinutes = logseq.settings.activeMinutes;
    const enableTelegramBot = logseq.settings.enableTelegramBot;
    if (
      enableTelegramBot &&
      activeHours.indexOf(hour + "") > -1 &&
      activeMinutes.indexOf(minute + "") > -1
    ) {
      getRandomNoteInfo().then((content) => {
        console.log(content);
        !!content && sendToTelegramBot(content);
      });
    }
  }, 60 * 1000);

  logseq.beforeunload(() => {
    window.clearInterval(sendContentInterval);
    console.log("logseq.beforeunload => clear sendContentInterval");
    return Promise.resolve();
  });
}

logseq.ready(main).catch(console.error);
