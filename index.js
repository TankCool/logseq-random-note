function createModel() {
  return {
    handleBtnClick() {
      openRandomPage()
    },
  };
}

function openPage(pageName) {
  logseq.App.pushState('page', {
    name: pageName
  })
}

async function openRandomPage() {
  try {
    let ret = await logseq.DB.datascriptQuery(`
    [:find (pull ?p [*])
      :where
      [_ :block/page ?p]]
    `)
    const pages = ret?.flat()
    if(pages && pages.length > 0) {
      const index = Math.floor(Math.random() * pages.length)
      openPage(pages[index].name)
    }
  } catch (err) {
    console.log(err)
  }
}

function main() {
  logseq.setMainUIInlineStyle({
    position: "fixed",
    zIndex: 11,
  });
  const key = logseq.baseInfo.id;
  const btnName = "random-note";
  // add style
  logseq.provideStyle(`
  @import url("https://at.alicdn.com/t/font_2809512_xxdycbg5pv.css");
  div[data-injected-ui=${btnName}-${key}] {
    display: flex;
    align-items: center;
    font-weight: 500;
    position: relative;
    top: 0px;
  }
  
  div[data-injected-ui=${btnName}-${key}] a {
    opacity: 1;
    padding: 6px;
  }
  
  div[data-injected-ui=${btnName}-${key}] iconfont {
    font-size: 18px;
  }
  `);
  // add toolbar
  logseq.App.registerUIItem("toolbar", {
    key: btnName,
    template: `
      <a title="I'm Feeling Lucky" class="button" data-on-click="handleBtnClick">
        <i class="iconfont icon-random"></i>
      </a>
    `,
  });
}

logseq.ready(createModel(), main).catch(console.error)