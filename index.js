import "@logseq/libs";

const settingsTemplate = [

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
    description:
      'Your custom query. e.g. [:find (pull ?b [*]) :where [?b :block/refs ?bp] [?bp :block/name "book"]]',
  },
  {
    key: "randomStepSize",
    type: 'enum',
    default: "1",
    title: "Random walk step size.",
    description: "Random walk step size. Use it with caution. One shows in main area, others show in the right sidebar.",
    enumChoices: ["1", "3", "5", "7", "10"],
    enumPicker: 'radio'
  }
];

logseq.useSettingsSchema(settingsTemplate);

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
    logseq.App.showMsg(
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
    const index = Math.floor(Math.random() * pages.length);
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
  for(var i = 0; i < counts; i++) {
    const index = Math.floor(Math.random() * pages.length);
    const page = pages[index];
    logseq.Editor.openInRightSidebar(page.uuid)
  }
}

function getQueryScript() {
  const randomMode = logseq.settings.randomMode;
  const includeJournals = logseq.settings.includeJournals;
  const randomTags = logseq.settings.randomTags.split(",");
  const defaultQuery = `
  [:find (pull ?p [*])
    :where
    [_ :block/page ?p]]`;
  switch (randomMode) {
    case "page":
      if (includeJournals) {
        return `
        [:find (pull ?p [*])
          :where
          [_ :block/page ?p]]`;
      } else {
        return `
        [:find (pull ?p [*])
          :where
          [_ :block/page ?p]
          [?p :block/journal? false]]`;
      }
    case "tags":
      const tags = randomTags.map((item) => '"' + item.toLowerCase() + '"').join(",");
      if (!logseq.settings.randomTags) {
        logseq.App.showMsg("Random tags are required.", "warning");
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
        return (
        `
        [:find (pull ?b [*])
          :where
          [?b :block/refs ?bp]
          [?bp :block/name ?name]
          [(contains? #{"card"} ?name)]]
        `
        );
    case "query":
      return logseq.settings.advancedQuery;
    default:
      console.log("unknown");
      return defaultQuery;
  }
}

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
        binding: "r n",
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
}

logseq.ready(main).catch(console.error);
