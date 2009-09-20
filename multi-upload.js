/**
 * == multiupload ==
 **/

/** section: multiupload
 * class MultiUpload
 * 
 * Before using this class, make sure you tell it where the SWFUpload
 * Flash file is located.
 * 
 *     MultiUpload.FLASH_URL = '/static/flash/swfupload.swf';
 * 
 * This class wraps a GUI around SWFUpload for performing multiple file
 * uploads asynchronously with progress feedback. To instantiate, provide
 * an element reference (or CSS selector), a URL to which files should be
 * uploaded, and an option list. For example:
 * 
 *     var uploader = new MultiUpload('#files', '/app/upload.html', {
 *         button: {
 *             // [button options]
 *         },
 *         // [upload options]
 *     });
 * 
 * The UI provided by `MultiUpload` will be inserted into the DOM after
 * the element referenced by `#files`. Files will be posted to (in this
 * example) `/app/upload.html` as the `Filedata` param of an HTTP POST.
 * 
 * `[button options]` is s list of options that describe the appearance
 * of the 'Browse' button, which SWFUpload will render in Flash. The
 * available options are:
 * 
 *   * `width`: width of the button in pixels
 *   * `height`: height of the button in pixels
 *   * `image`: URL of the image to use for the button
 *   * `text`: string of text to use for the button
 *   * `style`: CSS string to style the text, e.g. `"font-size: 24px; font-weight: bold;"`
 *   * `leftPadding`: left padding for the text, in pixels
 *   * `topPadding`: top padding of the text, in pixels
 * 
 * `[upload options]` specifies upload validation settings. Options include:
 * 
 *   * `sizeLimit`: maximum filesize in kilobytes
 *   * `fileTypes`: list of accepted file types, e.g. `"*.jpg;*.png"`
 *   * `fileDescription`: string description of the file types, e.g. `"Pictures"`
 * 
 * `MultiUpload` injects the following HTML into the document after the
 * element you specified.
 *
 *     <div class="multi-upload">
 *         <div class="browse-button">
 *             <object data="/swfupload.swf">...</object>
 *         </div>
 *         <div class="upload-button">Upload</div>
 *         <ul class="errors" />
 *         <ul class="queue" />
 *     </div>
 * 
 * As the user interacts with the control, the `"errors"` list will be
 * populated with validation errors enclosed in `<li>` tags. The
 * `"queue"` list will fill up with `<li>` elements each containing
 * progress information for queued files. Each `<li>` will look like this:
 * 
 *     <li class="[STATUS]">
 *         <p class="filename">holiday-photo.jpg (46 kB)</p>
 *         <p class="progress">[PROGRESS]</p>
 *         <div class="progress-bar">
 *             <div style="height: 100%; width: [XX]%;"></div>
 *         </div>
 *     </li>
 * 
 * `[STATUS]` will be a class reflecting the state of the upload; it
 * will be one of `queued`, `sending`, `error`, `complete` or `cancelled`.
 * `[PROGRESS]` will be a message telling the user the state of the
 * file, for example `"Ready"` or `"Sending: 47%"`. `[XX]` will be a
 * number between `0` and `100`, so the bar increases to fill the width
 * of its parent as the file is sent.
 **/
MultiUpload = new JS.Class({
  include: Ojay.Observable,
  
  /**
   * new MultiUpload(container, endpoint, settings)
   * - container (HTMLElement): element to insert the control after
   * - endpoint (String): URL to post files to
   * - settings (Object): options to configure the uploader
   **/
  initialize: function(container, endpoint, settings) {
    this._container = Ojay(container);
    this._endpoint = endpoint;
    this._container.insert(this.getHTML(), 'after');
    this._setup(settings);
    this._queue = [];
  },
  
  /**
   * MultiUpload#getHTML() -> Ojay.DomCollection
   * Returns an Ojay object wrapping the HTML for the `MultiUpload` UI.
   **/
  getHTML: function() {
    if (this._html) return this._html;
    var self = this;
    this._html = Ojay( Ojay.HTML.div({className: this.klass.CONTAINER_CLASS}, function(h) {
      h.div({className: self.klass.BUTTON_CLASS}, function(h) {
        self._buttonPlaceholder = h.div();
      });
      self._uploadButton = Ojay(h.div({className: self.klass.UPLOAD_CLASS}, self.klass.UPLOAD_TEXT));
      self._errors = Ojay(h.ul({className: self.klass.ERRORS_CLASS}));
      self._list = Ojay(h.ul({className: self.klass.QUEUE_CLASS}));
    }) );
    
    this._uploadButton.on('click', function(button, evnt) {
      this._getSWFUpload().startUpload();
    }, this);
    return this._html;
  },
  
  /**
   * MultiUpload#setup() -> undefined
   * Initializes the `SWFUpload` object used for transfering file data.
   **/
  _setup: function(settings) {
    this._getSWFUpload(settings);
  },
  
  /**
   * MultiUpload#_getSWFUpload() -> SWFUpload
   * Return the `SWFUpload` object used to transfer file data.
   **/
  _getSWFUpload: function(settings) {
    if (this._swfu) return this._swfu;
    
    var flashUrl = this.klass.FLASH_URL;
    if (!flashUrl) throw 'MultiUpload.FLASH_URL must specify SWFUpload .swf URL';
    
    var settings = settings || {},
        button   = settings.button || {},
        m        = this.method('method'),
        k        = this.klass;
    
    this._settings = {
      flash_url:                flashUrl,
      upload_url:               this._endpoint,

      file_size_limit:          settings.sizeLimit || k.SIZE_LIMIT,
      file_types:               settings.fileTypes || k.FILE_TYPES,
      file_types_description:   settings.fileDescription || k.FILE_DESCRIPTION,
      file_queue_limit:         0,

      debug:                    false,

      button_placeholder:       this._buttonPlaceholder,

      file_queued_handler:          m('_fileQueued'),
      file_queue_error_handler:     m('_fileQueueError'),
      file_dialog_complete_handler: m('_fileDialogComplete'),
      upload_start_handler:         m('_uploadStart'),
      upload_progress_handler:      m('_uploadProgress'),
      upload_error_handler:         m('_uploadError'),
      upload_success_handler:       m('_uploadSuccess'),
      upload_complete_handler:      m('_uploadComplete')
    };
    
    var merge = function(target, source, transform) {
      var value = button[source];
      if (!value) return;
      if (transform) value = transform(value);
      this._settings[target] = value;
    }.bind(this);
    
    merge('button_width',     'width');
    merge('button_height',    'height');
    merge('button_image_url', 'image');
    
    merge('button_text', 'text', function(s) { return '<span class="mu-button-text">'+s+'</span>' });
    merge('button_text_style', 'style', function(s) { return '.mu-button-text {'+s+'}' });
    
    merge('button_text_left_padding', 'leftPadding');
    merge('button_text_top_padding',  'topPadding');
    
    return this._swfu = new SWFUpload(this._settings);
  },
  
  /**
   * MultiUpload#_fileQueued(filedata) -> undefined
   * - filedata (Object): file data supplied by SWFUpload
   **/
  _fileQueued: function(filedata) {
    var file = new this.klass.FileProgress(this, filedata);
    this.notifyObservers('queue', file);
    this._queue.push(file);
    this._list.insert(file.getHTML());
  },
  
  /**
   * MultiUpload#_fileQueueError(filedata, code, message) -> undefined
   * - filedata (Object): file data supplied by SWFUpload
   * - code (Number): SWFUpload error code
   * - message (String): error message from SWFUpload
   **/
  _fileQueueError: function(filedata, code, message) {
    var file = new this.klass.FileProgress(this, filedata);
    this.notifyObservers('queueerror', file, code, message);
    this._queue.push(file);
    
    var err = err = SWFUpload.QUEUE_ERROR,
        msg = this.klass.MESSAGES[code];
    
    switch (code) {
      case err.QUEUE_LIMIT_EXCEEDED:
        msg += ' (limit: ' + this._settings.file_queue_limit + ')'; break;
      case err.FILE_EXCEEDS_SIZE_LIMIT:
        msg += ' (' + this.klass.formatSize(this._settings.file_size_limit*1024) + ')'; break;
      case err.INVALID_FILETYPE:
        msg += ' (allowed: ' + this._settings.file_types + ')'; break;
    }
    
    msg += ': ' + filedata.name + ' (' + this.klass.formatSize(filedata.size) + ')';
    this._errors.insert(Ojay.HTML.li(msg));
  },
  
  /**
   * MultiUpload#_fileDialogComplete() -> undefined
   **/
  _fileDialogComplete: function() {},
  
  /**
   * MultiUpload#_uploadStart(filedata) -> undefined
   * - filedata (Object): file data supplied by SWFUpload
   **/
  _uploadStart: function(filedata) {
    var file = this._queue[filedata.index];
    if (!file) return;
    file.setStatus(filedata.filestatus);
    this.notifyObservers('uploadstart', file);
  },
  
  /**
   * MultiUpload#_uploadProgress(filedata, sent, total) -> undefined
   * - filedata (Object): file data supplied by SWFUpload
   * - sent (Number): number of bytes sent
   * - total (Number): filesize in bytes
   **/
  _uploadProgress: function(filedata, sent, total) {
    var file = this._queue[filedata.index];
    if (!file) return;
    file.setSentBytes(sent);
    this.notifyObservers('uploadprogress', file, sent, total);
  },
  
  /**
   * MultiUpload#_uploadError(filedata, code, message) -> undefined
   * - filedata (Object): file data supplied by SWFUpload
   * - code (Number): SWFUpload error code
   * - message (String): error message from SWFUpload
   **/
  _uploadError: function(filedata, code, message) {
    var file = this._queue[filedata.index];
    if (!file) return;
    file.setStatus(filedata.filestatus);
    file.setError(message);
    this.notifyObservers('uploaderror', file, code, message);
  },
  
  /**
   * MultiUpload#_uploadSuccess(filedata) -> undefined
   * - filedata (Object): file data supplied by SWFUpload
   * - serverData (Object): data returned by the server
   **/
  _uploadSuccess: function(filedata, serverData) {
    var file = this._queue[filedata.index];
    if (!file) return;
    file.setStatus(filedata.filestatus);
    file.setSuccess();
    this.notifyObservers('uploadsuccess', file, serverData);
  },
  
  /**
   * MultiUpload#_uploadComplete(filedata) -> undefined
   * - filedata (Object): file data supplied by SWFUpload
   **/
  _uploadComplete: function(filedata) {
    var file = this._queue[filedata.index];
    if (!file) return;
    this._getSWFUpload().startUpload();
    this.notifyObservers('uploadcomplete', file);
  },
  
  /**
   * MultiUpload#addPostParam(name, value) -> undefined
   * - name (String): the name of the param
   * - value (String): the value of the param
   **/
  addPostParam: function(name, value) {
    return this._getSWFUpload().addPostParam(name, value);
  },
  
  /**
   * MultiUpload#removePostParam(name) -> undefined
   * - name (String): the name of the param
   **/
  removePostParam: function(name) {
    return this._getSWFUpload().removePostParam(name);
  },
  
  /**
   * MultiUpload#setPostParams(paramObject) -> undefined
   * - paramObject (Object): set of parameters as a JavaScript Object
   **/
  setPostParams: function(paramObject) {
    return this._getSWFUpload().setPostParams(paramObject);
  },
  
  extend: {
    /**
     * MultiUpload.CONTAINER_CLASS = 'multi-upload'
     * Class applied to HTML container for the UI
     **/
    CONTAINER_CLASS: 'multi-upload',
    
    /**
     * MultiUpload.ERRORS_CLASS = 'errors'
     * Class applied to error list in the UI
     **/
    ERRORS_CLASS: 'errors',
    
    /**
     * MultiUpload.QUEUE_CLASS = 'queue'
     * Class applied to queue list in the UI
     **/
    QUEUE_CLASS: 'queue',
    
    /**
     * MultiUpload.FLASH_URL = null
     * URL of the SWFUpload Flash file. Set this before using the class.
     **/
    FLASH_URL: null,
    
    /**
     * MultiUpload.SIZE_LIMIT = 0
     * Default file size limit (0 = unlimited)
     **/
    SIZE_LIMIT: 0,
    
    /**
     * MultiUpload.FILE_TYPES = '*.*'
     * Default allowed file types (all types)
     **/
    FILE_TYPES: '*.*',
    
    /**
     * MultiUpload.FILE_DESCRIPTION = 'All files'
     **/
    FILE_DESCRIPTION: 'All files',
    
    /**
     * MultiUpload.BUTTON_CLASS = 'browse-button'
     * Class applied to the browse button container in the UI
     **/
    BUTTON_CLASS: 'browse-button',
    
    /**
     * MultiUpload.UPLOAD_CLASS = 'upload-button'
     * Class applied to the 'upload' button in the UI
     **/
    UPLOAD_CLASS: 'upload-button',
    
    /**
     * MultiUpload.UPLOAD_TEXT = 'Upload'
     * Text for the 'upload' button in the UI
     **/
    UPLOAD_TEXT: 'Upload',
    
    /**
     * MultiUpload.PREFIXES = ['', 'k', 'M', 'G', 'T']
     * Prefixes used when formatting filesizes
     **/
    PREFIXES: ['', 'k', 'M', 'G', 'T'],
    
    /**
     * MultiUpload.formatBytes(bytes) -> String
     * - bytes (Number): filesize in bytes
     **/
    formatSize: function(bytes) {
      if (typeof bytes === 'string') return bytes;
      var power = (bytes === 0) ? 0 : Math.floor(Math.log(bytes) / Math.log(1024));
      return Math.round(bytes / Math.pow(1024, power)) +
             ' ' + this.PREFIXES[power] + 'B';
    },
    
    /** section: multiupload
     * class MultiUpload.FileProgress
     * 
     * This class encapsulates the UI for individual files. In generates HTML
     * to represent the file to the user and updates the HTML as upload events
     * are reported by SWFUpload.
     * 
     * See the `MultiUpload` class for examples of the generated HTML.
     **/
    FileProgress: new JS.Class({
      include: Ojay.Observable,
      
      extend: {
        /**
         * MultiUpload.FileProgress.FILENAME_CLASS = 'filename'
         **/
        FILENAME_CLASS: 'filename',
        
        /**
         * MultiUpload.FileProgress.PROGRESS_CLASS = 'progress'
         **/
        PROGRESS_CLASS: 'progress',
        
        /**
         * MultiUpload.FileProgress.BAR_CLASS = 'progress-bar'
         **/
        BAR_CLASS: 'progress-bar',
        
        /**
         * MultiUpload.FileProgress.READY_TEXT = 'Ready'
         **/
        READY_TEXT: 'Ready',
        
        /**
         * MultiUpload.FileProgress.SENDING_TEXT = 'Sending'
         **/
        SENDING_TEXT: 'Sending',
        
        /**
         * MultiUpload.FileProgress.COMPLETE_TEXT = 'Complete'
         **/
        COMPLETE_TEXT: 'Complete'
      },
      
      /**
       * new MultiUpload.FileProgress(uploader, filedata)
       * - uploader (MultiUpload): the parent MultiUpload instance
       * - filedata (Object): file data supplied by SWFUpload
       **/
      initialize: function(uploader, filedata) {
        this._uploader = uploader;
        this._filedata = filedata;
        this._status = MultiUpload.STATUSES[filedata.filestatus];
      },
      
      /**
       * MultiUpload.FileProgress#get(key) -> Object
       * - key (String): the name of the value to retrieve
       **/
      get: function(key) {
        return this._filedata[key];
      },
      
      /**
       * MultiUpload.FileProgress#getHTML() -> Ojay.DomCollection
       **/
      getHTML: function() {
        if (this._html) return this._html;
        var self = this;
        
        this._html = Ojay( Ojay.HTML.li({className: this._status}, function(h) {
          self._filename = Ojay( h.p({className: self.klass.FILENAME_CLASS},
              self._filedata.name + ' (' +
              MultiUpload.formatSize(self._filedata.size) + ')') );
          self._progress = Ojay( h.p({className: self.klass.PROGRESS_CLASS},
              self.klass.READY_TEXT) );
          self._bar = Ojay( h.div({className: self.klass.BAR_CLASS}, function(h) {
            self._progressBar = Ojay(h.div());
          }) );
        }) );
        
        this._progressBar.setStyle({
          overflow: 'hidden',
          width:    0,
          height:   '100%'
        });
        
        return this._html;
      },
      
      /**
       * MultiUpload.FileProgress#getFilenameElement() -> Ojay.DomCollection
       **/
      getFilenameElement: function() {
        return this._filename;
      },
      
      /**
       * MultiUpload.FileProgress#getProgressElement() -> Ojay.DomCollection
       **/
      getProgressElement: function() {
        return this._progress;
      },
      
      /**
       * MultiUpload.FileProgress#getProgressBar() -> Ojay.DomCollection
       **/
      getProgressBar: function() {
        return this._bar;
      },
      
      /**
       * MultiUpload.FileProgress#setStatus(code) -> undefined
       * - code (Number): status code from SWFUpload
       **/
      setStatus: function(code) {
        this.getHTML().removeClass(this._status);
        this._status = MultiUpload.STATUSES[code];
        this.getHTML().addClass(this._status);
      },
      
      /**
       * MultiUpload.FileProgress#setSentBytes(sent) -> undefined
       * - sent (Number): number of bytes so far uploaded
       **/
      setSentBytes: function(sent) {
        var percent = 100 * Math.round(sent / this._filedata.size) + '%';
        this._progress.setContent(this.klass.SENDING_TEXT + ': ' + percent);
        this._progressBar.setStyle({width: percent});
      },
      
      /**
       * MultiUpload.FileProgress#setSuccess() -> undefined
       **/
      setSuccess: function() {
        this._progress.setContent(this.klass.COMPLETE_TEXT);
      },
      
      /**
       * MultiUpload.FileProgress#setError(message) -> undefined
       * - message (String): error message from SWFUpload
       **/
      setError: function(message) {
        this._progress.setContent(message);
      }
    })
  }
});

(function() {
  var msg = MultiUpload.MESSAGES = {},
      err = SWFUpload.QUEUE_ERROR;
  
  msg[err.QUEUE_LIMIT_EXCEEDED]     = 'Queue limit exceeded';
  msg[err.FILE_EXCEEDS_SIZE_LIMIT]  = 'File exceeds size limit';
  msg[err.ZERO_BYTE_FILE]           = 'File contains no data';
  msg[err.INVALID_FILETYPE]         = 'Invalid filetype';
  
  var name = MultiUpload.STATUSES = {},
      stat = SWFUpload.FILE_STATUS;
  
  name[stat.QUEUED]       = 'queued';
  name[stat.IN_PROGRESS]  = 'sending';
  name[stat.ERROR]        = 'error';
  name[stat.COMPLETE]     = 'complete';
  name[stat.CANCELLED]    = 'cancelled';
})();

