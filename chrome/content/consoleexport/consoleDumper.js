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
Firebug.ConsoleExport.Dumper = extend(Firebug.Module,
/** @lends Firebug.ConsoleExport.Dumper */
{
    initialize: function(){
        
        if (FBTrace.DBG_CONSOLEEXPORT)
            FBTrace.sysout("initialize consoleexport.Dumper.dump");
        this.dumps = [];
        Firebug.Module.initialize.apply(this, arguments);

    },
    shutdown: function(){
        
        Firebug.Module.shutdown.apply(this, arguments);

        
        if (FBTrace.DBG_CONSOLEEXPORT)
            FBTrace.sysout("shutdown consoleexport.Dumper.dump with dumps.length="+this.dumps.length);

        var path = Firebug.getPref(prefDomain, "logFilePath");
        if (!path){
            return;
        }

        var content;
        var format = Firebug.getPref(prefDomain, "format")
        if (format != null && format.toLowerCase() == "json"){
            content = JSON.stringify(this.dumps);
        }
        else{
           content ="<logs>";
            for(var i=0; i<this.dumps.length; i++){
                content += this.buildPacket(this.dumps[i]);
            }
            content +="</logs>";
        }
        this.writeToFile({
            path: path,
            data: content
        });
    },
    dump: function(data)
    {
        this.dumps.push(data);
    },

    // TODO: c&p from consoleUploader, could be moved to some common util
    buildPacket: function(data) {
        var xml = "<log>";

        if (data.className)
            xml += "<class>" + data.className + "</class>";

        if (data.cat)
            xml += "<cat>" + data.cat + "</cat>";

        if (data.msg)
            xml += "<msg><![CDATA[" + data.msg + "]]></msg>";

        if (data.href)
            xml += "<href><![CDATA[" + data.href + "]]></href>";

        if (data.lineNo)
            xml += "<lineNo>" + data.lineNo + "</lineNo>";

        if (data.source)
            xml += "<source>" + data.source + "</source>";

        if (data.time)
            xml += "<time>" + this.dateToJSON(new Date(data.time)) + "</time>";

        xml += "</log>";

        return xml;
    },

    dateToJSON: function (date){
        function f(n, c) {
            if (!c) c = 2;
            var s = new String(n);
            while (s.length < c) s = "0" + s;
            return s;
        }

        if(!(date instanceof Date)){
            date = new Date(date);
        }
        var result = date.getFullYear() + '-' +
            f(date.getMonth() + 1) + '-' +
            f(date.getDate()) + 'T' +
            f(date.getHours()) + ':' +
            f(date.getMinutes()) + ':' +
            f(date.getSeconds()) + '.' +
            f(date.getMilliseconds(), 3);

        var offset = date.getTimezoneOffset();
        var positive = offset > 0;

        // Convert to positive number before using Math.floor (see issue 5512)
        offset = Math.abs(offset);
        var offsetHours = Math.floor(offset / 60);
        var offsetMinutes = Math.floor(offset % 60);
        var prettyOffset = (positive > 0 ? "-" : "+") + f(offsetHours) + ":" + f(offsetMinutes);

        return result + prettyOffset;
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
});
// ************************************************************************************************
// Registration

Firebug.registerModule(Firebug.ConsoleExport.Dumper);
// ************************************************************************************************
}});
