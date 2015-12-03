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
     * This object implements dumping messages to a file
     * This object is also responsible for building XML messages.
     */
    Firebug.ConsoleExport.Dumper =
    /** @lends Firebug.ConsoleExport.Dumper */
    {
        dump: function(data)
        {
            var format = Firebug.getPref(prefDomain, "format")
            var content = null;
            var contentType = "application/xml";

            if (format != null && format.toLowerCase() == "json")
            {
                contentType = "application/json";
                content = JSON.stringify(data)+",";
            }
            else {
                content = this.buildPacket(data);
            }
            var path = Firebug.getPref(prefDomain, "logFilePath");

            if (FBTrace.DBG_CONSOLEEXPORT)
                FBTrace.sysout("consoleexport.Dumper.dump; to: " +
                    (path ? path : "no file path specified"), path);

            if (!path)
                return;

            this.writeToFile({
                path: path,
                data: content
            });
        },

        // TODO: c&p from consoleUploader, could be moved to some common util
        buildPacket: function(data) {
            var xml = "<log>";

            if (data.className)
                xml += "<class>" + data.className + "</class>";

            if (data.cat)
                xml += "<cat>" + data.cat + "</cat>";

            if (data.msg)
                xml += "<msg>" + data.msg + "</msg>";

            if (data.href)
                xml += "<href>" + data.href + "</href>";

            if (data.lineNo)
                xml += "<lineNo>" + data.lineNo + "</lineNo>";

            if (data.source)
                xml += "<source>" + data.source + "</source>";

            xml += "</log>";

            return xml;
        },

        writeToFile: function(options) {
            try {
                var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
                file.initWithPath( options.path );
                if(file.exists() == false) {
                    file.create( Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
                }
                var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
                foStream.init(file, 0x02 | 0x10, 0666, 0); // open in append mode

                var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(Components.interfaces.nsIConverterOutputStream);
                converter.init(foStream, "UTF-8", 0, 0);
                converter.writeString( options.data );
                converter.close();
            }
            catch (e) {
                if (FBTrace.DBG_CONSOLEEXPORT || FBTrace.DBG_ERRORS)
                    FBTrace.sysout("consoleexport.writeToFile; EXCEPTION " + e, e);
            }
        }
    };

// ************************************************************************************************
}});