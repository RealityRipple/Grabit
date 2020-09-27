var EXPORTED_SYMBOLS = ["Grabit"];

const Cc = Components.classes;
const Ci = Components.interfaces;

var Grabit = {
  download: function(links) {
    let objects = {};
    if ("document" in links) {
      objects.document = links.document;
      delete links.document;
    }
    try {
     Cc["@mozilla.org/childprocessmessagemanager;1"].getService(Ci.nsIMessageSender)
      .sendAsyncMessage("Grabit::download", { links: links }, objects);
    } finally {
      if ("document" in objects) {
        links.document = objects.document;
      }
    }
  }
}