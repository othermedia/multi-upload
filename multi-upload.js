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
      self._errors = Ojay(h.ul({className: self.klass.ERRORS_CLASS}));
      self._list = Ojay(h.ul({className: self.klass.QUEUE_CLASS}));
    }) );
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
    
    return new SWFUpload(this._settings);
  },
  
  _fileQueued: function(filedata) {
    var file = new this.klass.FileProgress(this, filedata);
    this._queue.push(file);
    this._list.insert(file.getHTML());
  },
  
  _fileQueueError: function(filedata, code) {
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
  _uploadStart: function() {},
  _uploadProgress: function() {},
  _uploadError: function() {},
  _uploadSuccess: function() {},
  _uploadComplete: function() {},
  _queueComplete: function() {},
  
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
        FILENAME_CLASS: 'filename'
      },
      
      initialize: function(uploader, filedata) {
        this._uploader = uploader;
        this._filedata = filedata;
      },
      
      getHTML: function() {
        if (this._html) return this._html;
        var self = this;
        this._html = Ojay.HTML.li(function(h) {
          h.p({className: self.klass.FILENAME_CLASS},
              self._filedata.name + ' (' +
              MultiUpload.formatSize(self._filedata.size) + ')');
        });
        return this._html;
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
})();

