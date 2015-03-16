/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

// ************************************************************************************************
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;

var prefDomain = "extensions.firebug.consoleexport";

// ************************************************************************************************
// Module implementation

/**
 * @module This object represents the main module of the extension. Among its responsibility
 * belongs UI internationalization, managing auto-export feature, basic registration within
 * Firebug framework and also a simple support for debugging.
 * All other objects in this extension are defined within this object (namespace).
 * 
 * The purpose of this extension is to catch Console logs and sent them to a server that can
 * be specified using extensions.firebug.consoleexport.serverURL preference.
 */
Firebug.ConsoleExport = extend(Firebug.Module,
/** @lends Firebug.ConsoleExport */
{
    /**
     * Called by Firebug when new browser window is opened with Firebug.
     */
    initialize: function()
    {
        Firebug.Module.initialize.apply(this, arguments);

        if (Firebug.TraceModule)
            Firebug.TraceModule.addListener(this.TraceListener);
    },

    /**
     * Called by Firebug when a browser window with Firebug is closed.
     */
    shutdown: function()
    {
        Firebug.Module.shutdown.apply(this, arguments);

        if (Firebug.TraceModule)
            Firebug.TraceModule.removeListener(this.TraceListener);
    },

    /**
     * Called by Firebug to internationalize UI.
     */
    internationalizeUI: function(doc)
    {
        if (FBTrace.DBG_CONSOLEEXPORT)
            FBTrace.sysout("consoleexport.internationalizeUI");

        var elements = ["consoleExportAuto, consoleExportHelp, consoleExportAbout",
            "consoleExportToFile", "consoleExportMenu"];

        for (var i=0; i<elements.length; i++)
        {
            var element = $(elements[i], doc);
            if (!element)
                continue;

            FBL.internationalize(element, "label");
            FBL.internationalize(element, "tooltiptext");
            FBL.internationalize(element, "buttontooltiptext");
        }
    },

    /**
     * Initialize context (the object with per-page data). There are currently
     * no data in the context, but this at least reserves the namespace.
     */
    initContext: function(context)
    {
        context.consoleExport = {};
    },

    /**
     * Toggle auto-export on and off. This method is called when the user clicks
     * the toolbar button.
     */
    toggleAutoExport: function(context)
    {
        if (this.Automation.isActive())
            this.Automation.deactivate();
        else
            this.Automation.activate();
    },

    /**
     * Opens an online help page in a new tab.
     * xxxHonza: the page doesn't exist yet.
     */
    onHelp: function(event)
    {
        openNewTab("http://www.janodvarko.cz/consoleexport/");
        cancelEvent(event);
    },

    /**
     * Opens an online help page in a new tab.
     * xxxHonza: the page doesn't exist yet.
     */
    onAbout: function(event, context)
    {
        Components.utils["import"]("resource://gre/modules/AddonManager.jsm");

        // Firefox 4.0 implements new AddonManager.
        if (AddonManager)
        {
            AddonManager.getAddonByID("firebug@software.joehewitt.com", function(addon) {
                openDialog("chrome://mozapps/content/extensions/about.xul", "",
                "chrome,centerscreen,modal", addon);
            });
        }
        else
        {
            var extensionManager = FBL.CCSV("@mozilla.org/extensions/manager;1",
                "nsIExtensionManager");

            openDialog("chrome://mozapps/content/extensions/about.xul", "",
                "chrome,centerscreen,modal", "urn:mozilla:item:consoleexport@janodvarko.cz",
                extensionManager.datasource);
        }
    },

    onSaveAs: function(event, context)
    {
        var file = this.getTargetFile(context);
        if (!file)
            return;

        var doc = context.getPanel("console").document;
        var serializer = new XMLSerializer();
        var foStream = Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);
        file.createUnique(Ci.nsIFile.NORMAL_FILE_TYPE, 0666);
        foStream.init(file, 0x02 | 0x08 | 0x20, 0664, 0);   // write, create, truncate
        serializer.serializeToStream(doc, foStream, "");   // remember, doc is the DOM tree
        foStream.close();
    },

    // Open File Save As dialog and let the user to pick proper file location.
    getTargetFile: function(context)
    {
        var nsIFilePicker = Ci.nsIFilePicker;
        var fp = CCIN("@mozilla.org/filepicker;1", "nsIFilePicker");
        fp.init(window, null, nsIFilePicker.modeSave);
        fp.appendFilters(nsIFilePicker.filterAll | nsIFilePicker.  filterHTML);
        fp.filterIndex = 1;

        var defaultFileName = this.getDefaultFileName(context) + ".html";

        fp.defaultString = defaultFileName;

        var rv = fp.show();
        if (rv == nsIFilePicker.returnOK || rv == nsIFilePicker.returnReplace)
            return fp.file;

        return null;
    },

    getDefaultFileName: function(context)
    {
        var loc = Firebug.ConsoleExport.safeGetWindowLocation(context.window);
        return  (loc & loc.host) ? loc.host : "firebug-console";
    },
});

// ************************************************************************************************
// Shared functions

Firebug.ConsoleExport.safeGetWindowLocation = function(win)
{
    try
    {
        if (!win)
            return null;

        if (win.closed)
            return null;

        if ("location" in win)
        {
            if (typeof(win.location) == "object" && "toString" in win.location)
                return win.location;
            else if (typeof (win.location) == "string")
                return win.location;
        }
    }
    catch(exc)
    {
        if (FBTrace.DBG_NETEXPORT || FBTrace.DBG_ERRORS)
            FBTrace.sysout("netexport.getWindowLocation; EXCEPTION window:", win);
    }

    return null;
}

// ************************************************************************************************

/**
 * Listener for Firebug tracing console (console for debugging Firebug and Firebug extensions)
 * This listener customizes appearance of ConsoleExport messages in the console so, they are
 * easily distinguishable from other messages.
 * This extension uses extensions.firebug.DBG_CONSOLEEXPORT preference, which creates new
 * CONSOLEEXPORT option in the Firebug tracing console.
 */
Firebug.ConsoleExport.TraceListener =
/** @lends Firebug.ConsoleExport.TraceListener */
{
    onLoadConsole: function(win, rootNode)
    {
        var doc = rootNode.ownerDocument;
        var styleSheet = createStyleSheet(doc,
            "chrome://consoleexport/skin/consoleexport.css");
        styleSheet.setAttribute("id", "consoleExportLogs");
        addStyleSheet(doc, styleSheet);
    },

    onDump: function(message)
    {
        var index = message.text.indexOf("consoleexport.");
        if (index == 0)
            message.type = "DBG_CONSOLEEXPORT";
    }
};

// ************************************************************************************************
// Registration

Firebug.registerStringBundle("chrome://consoleexport/locale/consoleexport.properties");
Firebug.registerModule(Firebug.ConsoleExport);

// ************************************************************************************************
}});
