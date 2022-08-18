/***** BEGIN LICENSE BLOCK *****

    FlashGot - a Firefox extension for external download managers integration
    Copyright (C) 2004-2013 Giorgio Maone - g.maone@informaction.com

    This program is free software; you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation; either version 2 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program; if not, write to the Free Software
    Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
                             
***** END LICENSE BLOCK *****/


var gGrabitDMDialog = null;

function GrabitDMDialog() {
  gGrabitDMDialog = this;

  this.url = dialog.mLauncher.source.spec;
  
  
  
  try {
    this.openerDocument = dialog.mContext.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
      .getInterface(Components.interfaces.nsIDOMWindow).document;
  } catch(ex) {
    this.openerDocument = top.opener && top.opener.content && top.opener.content.document || null;
  }
  
  try {
      this.referrer = dialog.mContext.QueryInterface(
        Components.interfaces.nsIWebNavigation).currentURI.spec;
  } catch(ex) {
     this.referrer = this.openerDocument && this.openerDocument.URL || this.url;
  }
  
  
  this.dialog = dialog;
  

  this.fname = dialog.mLauncher.suggestedFileName;
  var ext = this.fname.split('.');
  this.ext = ext.length > 0 ? ext[ext.length -1].toLowerCase() : "";
  this.extensionExists = gGrabitService.extensions.indexOf(this.ext) > -1;
  const itc = gGrabitService.interceptor;
  
  
  if(itc.lastPost) {
    gGrabitService.log("Recent post info found: " + itc.lastPost + ", " +
                         itc.lastPost.URI.spec + " VS " + this.url + ", " +
                         itc.lastPost.isPending() +
                         ", " + (itc.lastPost.URI == dialog.mLauncher.source));
    if(itc.lastPost.URI.spec == this.url &&
       (itc.lastPost.isPending() || itc.lastPost.URI == dialog.mLauncher.source)) {
      this.postChannel = itc.lastPost;
    }
  }
  
  if(gGrabitService.DMS.found && (!itc.bypassAutoStart)
      && (itc.forceAutoStart
          || ( itc.autoStart
            && (itc.interceptAll
                || this.extensionExists)))) {
    this.download();
    return;
  }

  window.setTimeout(function() { gGrabitDMDialog.init(); }, 0);
  
  if(typeof(ReGetDmDialog) != "undefined") {
    ReGetDmDialog.prototype.init = function() {};
    document.getElementById("regetRadio").style.display = "none";
    document.getElementById("regetBasic").style.display = "none";
  }
  
  this.forceNormal();
}

GrabitDMDialog.prototype = {
  get choosen() {
    return gGrabitService.getPref("dmchoice", false);
  }, 
  set choosen(v) {
    gGrabitService.setPref("dmchoice", v);
    return v;
  },
  
 
  remember: null,
  choice: null,
  check: null,

  forceNormal: function(secondChance) {
    var basicBox = document.getElementById('basicBox');
    var normalBox = document.getElementById('normalBox');
    var self = this;
    if ((normalBox && basicBox)) {
      if (normalBox.collapsed && basicBox.collapsed && !secondChance) {
        window.setTimeout(function() { self.forceNormal(true); }, 10);
        return;
      }
      if (normalBox.collapsed) {
        
        var e = document.getElementById('open');
        e.parentNode.collapsed = true;
        e.disabled = true;
        
        var nodes = normalBox.getElementsByTagName('separator');
        for (var j = nodes.length; j-- > 0;) {
          nodes[j].collapsed = true;
        }
        
        basicBox.collapsed = true;
        normalBox.collapsed = false;
      }
    }
    self.sizeToContent();
  },
  
  sizeToContent: function() {
    return window.sizeToContent();
  },
  
  init: function() {
    
    const dmsMenu = this.dmsMenu = document.getElementById("grabit-dms");
      
    this.remember = document.getElementById("rememberChoice") || document.getElementById("alwaysHandle");
    if(this.remember) {
      this.remember.collapsed = false;
      if(this.remember.id == "rememberChoice" && 
        this.remember.parentNode.previousSibling &&
        this.remember.parentNode.previousSibling.nodeName == "separator") {
        this.remember.parentNode.previousSibling.collapsed = false;
      }
    }
   
    
    this.choice = document.getElementById("grabit-dmradio");
    this.check = document.getElementById("grabit-dmcheck");

    const dms = gGrabitService.DMS;
    if(!dms.found) {
      this.choice.setAttribute("disabled", "true");
      if(this.check) this.check.setAttribute("disabled", "true");
      dmsMenu.setAttribute("collapsed", "true");
      return;
    }
    const defaultDM = gGrabitService.defaultDM; 
    
    

    var menuItem;
    var enabledDMSs=0;
    dmsMenu.removeAllItems();
    var dm;
    for(var j=0, len = dms.length; j<len; j++) {
      dm=dms[j];
      if(dm.supported) {
        enabledDMSs++;
        menuItem=dmsMenu.appendItem(dm.name, dm.codeName);
        if(defaultDM==dm.name) {
          dmsMenu.selectedItem=menuItem;
        }
      }
    }
    
    const modeRadioGroup=document.getElementById("mode");
    
    if(enabledDMSs < 2) {
      dmsMenu.setAttribute("collapsed","true");
    } else {
      dmsMenu.addEventListener("popuphidden", function() {
        gGrabitDMDialog.toggleChoice();
      }, true);
      
      const openRadio = document.getElementById("open");
      if(openRadio) {
        var maxWidth = Math.max(
          openRadio.boxObject.width, this.choice.boxObject.width
        );
        if(maxWidth > 0) openRadio.width = this.choice.width = maxWidth;
      }
    }
    
    if(this.choosen) {
      if(this.remember) this.remember.checked = this.extensionExists && gGrabitService.interceptor.autoStart;
      document.getElementById("mode").selectedItem = this.choice;
      if(this.check) this.check.checked = true;
    }
    
    this.toggleChoice();
    modeRadioGroup.addEventListener(
      "select", function(event) {
        gGrabitDMDialog.toggleChoice(event)
      },true);
    
    var d = document.documentElement;
    d.setAttribute('ondialogaccept',
      'if(gGrabitDMDialog.dialogAccepted()) { '
      + document.documentElement.getAttribute('ondialogaccept')
      +'}');
      d.setAttribute("onblur", "if(dialog) {" + d.getAttribute("onblur") + " }");
  }
,
  toggleChoice: function() {
    var dmchoice = document.getElementById("mode").selectedItem == this.choice;
    
    this.choosen = dmchoice;
    var remember = this.remember;
    
    if(dmchoice) {
      this.dmsMenu.removeAttribute("disabled");
      window.setTimeout(
        function() { 
          document.documentElement.getButton('accept').disabled = false;
        }, 10);
      if(remember) {
        remember.disabled = false;
      }
    } else {
      this.dmsMenu.setAttribute("disabled", true);
    }
  }
,
   dialogAccepted: function() {
    if(this.choosen) {
      if(this.remember && this.remember.checked) {
        gGrabitService.addExtension(this.ext);
        gGrabitService.interceptor.autoStart = true;
      }
      if(this.dmsMenu.selectedItem) {
        gGrabitService.defaultDM = this.dmsMenu.selectedItem.getAttribute("label");
      }
      this.download();
      return false;
    } else {
      return true;
    }
  }
,
  download: function() {
    var links=[ {
       href: this.url, 
       description: this.fname,
       fname: this.fname,
       noRedir: true
    } ];
    links.referrer = this.referrer;
    links.document = this.openerDocument;
    links.browserWindow = gGrabitService.getBrowserWindow(links.document);
    if(this.postChannel) {
      gGrabitService.interceptor.extractPostData(this.postChannel, links);
    }
    gGrabitService.download(links);
    with(document.documentElement) {
      removeAttribute('ondialogaccept');
      removeAttribute('onblur');
      removeAttribute('onfocus');
      cancelDialog();
    }
  }
}

window.addEventListener("load",  function(e) { new GrabitDMDialog(); }, false);



