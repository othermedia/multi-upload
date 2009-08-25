MultiUpload = new JS.Class({
  include: Ojay.Observable,
  
  initialize: function(container, endpoint, settings) {
    this._container = Ojay(container);
    this._endpoint = endpoint;
    this._container.insert(this.getHTML(), 'after');
    this.setup(settings);
    this._queue = [];
  },
  
  getHTML: function() {
    if (this._html) return this._html;
    var self = this;
    this._html = Ojay( Ojay.HTML.div({className: this.klass.CONTAINER_CLASS}, function(h) {
      self._buttonPlaceholder = h.div();
      self._uploadButton = Ojay(h.div({className: self.klass.UPLOAD_CLASS}, self.klass.UPLOAD_TEXT));
      self._errors = Ojay(h.ul({className: self.klass.ERRORS_CLASS}));
      self._list = Ojay(h.ul({className: self.klass.QUEUE_CLASS}));
    }) );
    
    this._uploadButton.on('click', function(button, evnt) {
      this._getSWFUpload().startUpload();
    }, this);
    return this._html;
  },
  
  setup: function(settings) {
    this._getSWFUpload(settings);
  },
  
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
      button_width:             button.width  || k.BUTTON_WIDTH,
      button_height:            button.height || k.BUTTON_HEIGHT,

      button_text:              '<span class="mu-button-text">' + 
                                (button.text   || k.BUTTON_TEXT) +
                                '</span>',

      button_text_style:        '.mu-button-text {' +
                                (button.style  || k.BUTTON_TEXT_STYLE) + '}',

      button_text_left_padding: button.leftPadding || k.BUTTON_TEXT_LEFT_PADDING,
      button_text_top_padding:  button.topPadding  || k.BUTTON_TEXT_TOP_PADDING,

      file_queued_handler:          m('_fileQueued'),
      file_queue_error_handler:     m('_fileQueueError'),
      file_dialog_complete_handler: m('_fileDialogComplete'),
      upload_start_handler:         m('_uploadStart'),
      upload_progress_handler:      m('_uploadProgress'),
      upload_error_handler:         m('_uploadError'),
      upload_success_handler:       m('_uploadSuccess'),
      upload_complete_handler:      m('_uploadComplete')
    };
    
    return this._swfu = new SWFUpload(this._settings);
  },
  
  _fileQueued: function(filedata) {
    this.notifyObservers('queue', filedata);
    var file = new this.klass.FileProgress(this, filedata);
    this._queue.push(file);
    this._list.insert(file.getHTML());
  },
  
  _fileQueueError: function(filedata, code) {
    this.notifyObservers('queueerror', filedata, code);
    var file = new this.klass.FileProgress(this, filedata);
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
  
  _fileDialogComplete: function() {},
  
  _uploadStart: function(filedata) {
    this.notifyObservers('uploadstart', filedata);
    var file = this._queue[filedata.index];
    if (!file) return;
    file.setStatus(filedata.filestatus);
  },
  
  _uploadProgress: function(filedata, sent, total) {
    this.notifyObservers('uploadprogress', filedata, sent, total);
    var file = this._queue[filedata.index];
    if (!file) return;
    file.setSentBytes(sent);
  },
  
  _uploadError: function(filedata, code) {
    this.notifyObservers('uploaderror', filedata, code);
  
  },
  
  _uploadSuccess: function(filedata) {
    this.notifyObservers('uploadsuccess', filedata);
    var file = this._queue[filedata.index];
    if (!file) return;
    file.setStatus(filedata.filestatus);
    file.setComplete();
  },
  
  _uploadComplete: function(filedata) {
    this.notifyObservers('uploadcomplete', filedata);
    this._getSWFUpload().startUpload();
  },
  
  addPostParam: function(name, value) {
    return this._getSWFUpload().addPostParam(name, value);
  },
  
  removePostParam: function(name) {
    return this._getSWFUpload().removePostParam(name);
  },
  
  setPostParams: function(paramObject) {
    return this._getSWFUpload().setPostParams(paramObject);
  },
  
  extend: {
    CONTAINER_CLASS:    'multi-upload',
    ERRORS_CLASS:       'errors',
    QUEUE_CLASS:        'queue',
    FLASH_URL:          null,
    
    SIZE_LIMIT:         0,
    FILE_TYPES:         '*.*',
    FILE_DESCRIPTION:   'All files',
    
    BUTTON_WIDTH:       150,
    BUTTON_HEIGHT:      50,
    BUTTON_TEXT:        'Browse',
    BUTTON_TEXT_STYLE:  'font-size: 24px;',
    BUTTON_TEXT_LEFT_PADDING: 12,
    BUTTON_TEXT_TOP_PADDING:  3,
    
    UPLOAD_CLASS:       'upload-button',
    UPLOAD_TEXT:        'Upload',
    
    PREFIXES: ['', 'k', 'M', 'G', 'T'],
    
    formatSize: function(bytes) {
      if (typeof bytes === 'string') return bytes;
      var power = (bytes === 0) ? 0 : Math.floor(Math.log(bytes) / Math.log(1024));
      return Math.round(bytes / Math.pow(1024, power)) +
             ' ' + this.PREFIXES[power] + 'B';
    },
    
    FileProgress: new JS.Class({
      include: Ojay.Observable,
      
      extend: {
        FILENAME_CLASS: 'filename',
        PROGRESS_CLASS: 'progress',
        BAR_CLASS:      'progress-bar',
        READY_TEXT:     'Ready',
        SENDING_TEXT:   'Sending',
        COMPLETE_TEXT:  'Complete'
      },
      
      initialize: function(uploader, filedata) {
        this._uploader = uploader;
        this._filedata = filedata;
        this._status = MultiUpload.STATUSES[filedata.filestatus];
      },
      
      getHTML: function() {
        if (this._html) return this._html;
        var self = this;
        
        this._html = Ojay( Ojay.HTML.li({className: this._status}, function(h) {
          h.p({className: self.klass.FILENAME_CLASS},
              self._filedata.name + ' (' +
              MultiUpload.formatSize(self._filedata.size) + ')');
          self._progress = Ojay( h.p({className: self.klass.PROGRESS_CLASS},
              self.klass.READY_TEXT) );
          h.div({className: self.klass.BAR_CLASS}, function(h) {
            self._progressBar = Ojay(h.div());
          });
        }) );
        
        this._progressBar.setStyle({
          overflow: 'hidden',
          width:    0,
          height:   '100%'
        });
        
        return this._html;
      },
      
      setStatus: function(code) {
        this.getHTML().removeClass(this._status);
        this._status = MultiUpload.STATUSES[code];
        this.getHTML().addClass(this._status);
      },
      
      setSentBytes: function(sent) {
        var percent = 100 * Math.round(sent / this._filedata.size) + '%';
        this._progress.setContent(this.klass.SENDING_TEXT + ': ' + percent);
        this._progressBar.setStyle({width: percent});
      },
      
      setComplete: function() {
        this._progress.setContent(this.klass.COMPLETE_TEXT);
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

