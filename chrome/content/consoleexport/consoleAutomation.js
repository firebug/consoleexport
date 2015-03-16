/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

// ************************************************************************************************
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;

var autoExportButton = $("consoleExportAuto");

var prefDomain = "extensions.firebug.consoleexport";

// ************************************************************************************************
// Module implementation

/**
 * @module This module is implementing the auto-export feature and also responsible for
 * updating the UI. This feature is using extensions.firebug.consoleexport.active
 * (false by default) preference to store its state across Firefox session.
 * This preference can be also used in automated processes when auto-export should be done
 * without manual interaction.
 * Note that the UI is automatically updated if the preference is changed using about:config
 */
Firebug.ConsoleExport.Automation = extend(Firebug.Module,
/** @lends Firebug.ConsoleExport.Automation */
{
    initialize: function(owner)
    {
        Firebug.Module.initialize.apply(this, arguments);

        // Initial activation according to the preferences.
        var active = Firebug.getPref(prefDomain, "active");
        this.updateOption("consoleexport.active", active);
    },

    shutdown: function()
    {
        Firebug.Module.shutdown.apply(this, arguments);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // Activation

    /**
     * Returns true if the auto-export is activated.
     */
    isActive: function()
    {
        return Firebug.getPref(prefDomain, "active");
    },

    /**
     * Activates the auto-export feature (console logs will be sent to a specified server).
     */
    activate: function()
    {
        if (FBTrace.DBG_CONSOLEEXPORT)
            FBTrace.sysout("consoleexport.Automation: Auto export activated.");

        Firebug.setPref(prefDomain, "active", true);
    },

    /**
     * Deactivates the auto-export feature.
     */
    deactivate: function()
    {
        if (FBTrace.DBG_CONSOLEEXPORT)
            FBTrace.sysout("consoleexport.Automation: Auto export deactivated.");

        Firebug.setPref(prefDomain, "active", false);
    },

    updateUI: function()
    {
        var active = this.isActive();
        autoExportButton.setAttribute("state", active ? "active" : "inactive");
        autoExportButton.setAttribute("tooltiptext", active ?
            $STR("consoleexport.menu.tooltip.Deactivate Auto Export") :
            $STR("consoleexport.menu.tooltip.Activate Auto Export"));
    },

    /**
     * Called by Firebug if a preference from extensions.firebug namespace has been changed.
     * Updates the UI if it's our extensions.firebug.consoleexport.active preference.
     */
    updateOption: function(name, value)
    {
        if (name != "consoleexport.active")
            return;

        if (FBTrace.DBG_CONSOLEEXPORT)
            FBTrace.sysout("consoleexport.Automation.updateOption; " + name + ": " + value);

        this.updateUI();

        if (value)
            Firebug.ConsoleExport.Listener.register();
        else
            Firebug.ConsoleExport.Listener.unregister();
    }
});

// ************************************************************************************************
// Registration

Firebug.registerModule(Firebug.ConsoleExport.Automation);

// ************************************************************************************************
}});
