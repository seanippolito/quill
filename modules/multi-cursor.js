import Module from "../core/module";
import rangeFix from 'rangefix';
import tinycolor from 'tinycolor2';

DEFAULTS = {
  template: [
    '<span class="ql-cursor-selections"></span>',
    '<span class="ql-cursor-caret-container">',
    '  <span class="ql-cursor-caret"></span>',
    '</span>',
    '<div class="ql-cursor-flag">',
    '  <small class="ql-cursor-name"></small>',
    '  <span class="ql-cursor-flag-flap"></span>',
    '</div>'
  ].join(''),
  autoRegisterListener: true,
  hideDelay: 3000,
  hideSpeed: 400
};


class QuillCursors extends Module{
  // DONE
  constructor(quill, options) {
    super(quill, options);
    this.quill = quill;
    // this.options = Object.assign({}, DEFAULTS, options);
    // this.container = quill.addContainer('ql-multi-cursor');
    // this.cursors = {};
    // quill.on('text-change', this.applyDelta.bind(this));

    this.initOptions(options);
    this.cursors = {};
    this.container = this.quill.addContainer('ql-cursors');

    if (this.options.autoRegisterListener)
      this.registerTextChangeListener();

    window.addEventListener('resize', this.update.bind(this));

  }

  // DONE
  initOptions(options) {
    this.options = DEFAULTS;
    this.options.template = options.template || this.options.template;
    this.options.autoRegisterListener = (options.autoRegisterListener === false) ? options.autoRegisterListener : this.options.autoRegisterListener;
    this.options.hideDelay = (options.hideDelay === undefined) ? this.options.hideDelay : options.hideDelay;
    this.options.hideSpeed = (options.hideSpeed === undefined) ? this.options.hideSpeed : options.hideSpeed;
  };

  // DONE
  registerTextChangeListener() {
    this.quill.on(this.quill.constructor.events.TEXT_CHANGE, this._applyDelta.bind(this));
  };

  // DONE
  clearCursors() {
    Object.keys(this.cursors).forEach(this.removeCursor.bind(this));
  }

  moveCursor(userId, range) {
    var cursor = this.cursors[userId];
    if(cursor) {
      cursor.range = range;
      cursor.el.classList.remove('ql-hidden');
      clearTimeout(cursor.timer);
      cursor.timer = setTimeout(() => {
        cursor.el.classList.add('ql-hidden');
        cursor.timer = null;
      }, this.options.timeout);
      this.updateCursor(cursor);
      return cursor;
    }
  }

  // DONE
  removeCursor(userId) {
    var cursor = this.cursors[userId];
    if(cursor) {
      cursor.el.parentNode.removeChild(cursor.el);
    }
    delete this.cursors[userId];
  }

  // DONE
  setCursor(userId, range, name, color) {
    // if(!this.cursors[userId]) {
    //   var cursor = {
    //     userId: userId,
    //     index: index,
    //     color: color,
    //     elem: this.buildCursor(name, color)
    //   }
    //   this.cursors[userId] = cursor;
    // }
    if (!this.cursors[userId]) {
      var cursor = {
        userId: userId,
        color: color,
        range: range,
        el: null,
        selectionEl: null,
        caretEl: null,
        flagEl: null
      };
      this.cursors[userId] = cursor;
      this.buildCursor(userId, name);
    }
    setTimeout(() => {
      this.moveCursor(userId, range);
    }, 1);

    return this.cursors[userId];
  }

  // DONE
  shiftCursors(index, length, authorId = null) {
    var cursor;

    // Object.values(this.cursors).forEach((cursor) => {
    //   var shift = Math.max(length, index - cursor.index);
    //   if(cursor.userId == authorId) {
    //     this.moveCursor(authorId, cursor.index + shift);
    //   } else if(cursor.index > index) {
    //     cursor.index += shift;
    //   }
    // });

    Object.keys(this.cursors).forEach((userId) => {
      if ((cursor = this.cursors[userId]) && cursor.range) {
        // If characters we're added or there is no selection
        // advance start/end if it's greater or equal than index
        if (length > 0 || cursor.range.length == 0)
          this.shiftCursor(userId, index - 1, length);
        // Else if characters were removed
        // move start/end back if it's only greater than index
        else
          this.shiftCursor(userId, index, length);
      }
    });
  }

  // DONE
  shiftCursor(userId, index, length) {
    var cursor = this.cursors[userId];
    if (cursor.range.index > index)
      cursor.range.index += length;
  };

  // DONE
  update() {
    Object.values(this.cursors).forEach(this.updateCursor.bind(this));
  }

  // DONE
  applyDelta(delta) {
    var index = 0;
    delta.ops.forEach((op) => {
      var length = 0;
      if (op.insert) {
        length = op.insert.length || 1;
        var author = op.attributes ? op.attributes.author : null;
        this.shiftCursors(index, length, author);
      } else if(op.delete) {
        this.shiftCursors(index, -1*op.delete, null);
      } else if(op.retain) {
        // this.shiftCursors(index, 0, null);
        length = op.retain;
      }
      index += length;
    });
    this.update();
  }

  buildCursor(name, color) {
    // var cursorEl = document.createElement('span');
    // cursorEl.classList.add('ql-cursor');
    // cursorEl.innerHTML = this.options.template;
    // var cursorFlag = cursorEl.querySelector('.ql-cursor-flag');
    // var cursorName = cursorEl.querySelector('.ql-cursor-name');
    // var nameTextNode = document.createTextNode(name);
    // cursorName.appendChild(nameTextNode);
    // var cursorCaret = cursorEl.querySelector('.ql-cursor-caret');
    // cursorCaret.style.backgroundColor = cursorName.style.backgroundColor = color;
    // this.container.appendChild(cursorEl);
    // return cursorEl;

    var cursor = this.cursors[userId];
    var el = document.createElement('span');
    var selectionEl;
    var caretEl;
    var flagEl;

    el.classList.add('ql-cursor');
    el.innerHTML = this.options.template;
    selectionEl = el.querySelector('.ql-cursor-selections');
    caretEl = el.querySelector('.ql-cursor-caret-container');
    flagEl = el.querySelector('.ql-cursor-flag');

    // Set color
    flagEl.style.backgroundColor = cursor.color;
    caretEl.querySelector('.ql-cursor-caret').style.backgroundColor = cursor.color;

    el.querySelector('.ql-cursor-name').innerText = name;

    // Set flag delay, speed
    flagEl.style.transitionDelay = this.options.hideDelay + 'ms';
    flagEl.style.transitionDuration = this.options.hideSpeed + 'ms';

    this.container.appendChild(el);

    // Set cursor elements
    cursor.el = el;
    cursor.selectionEl = selectionEl;
    cursor.caretEl = caretEl;
    cursor.flagEl = flagEl;
  }

  hideCursor(userId) {
    var cursor = this.cursors[userId];
    if (cursor)
      cursor.el.classList.add('hidden');
  };

  updateCursor(cursor) {
    // var bounds = this.quill.getBounds(cursor.index);
    // if(bounds) {
    //   cursor.elem.style.top = (bounds.top + this.quill.container.scrollTop) + 'px';
    //   cursor.elem.style.left = bounds.left + 'px';
    //   cursor.elem.style.height = bounds.height + 'px';
    //   var flag = cursor.elem.querySelector('.ql-cursor-flag');
    //   cursor.elem.classList.toggle('ql-top', parseInt(cursor.elem.style.top) <= flag.offsetHeight);
    //   cursor.elem.classList.toggle('ql-left', parseInt(cursor.elem.style.left) <= flag.offsetWidth);
    //   cursor.elem.classList.toggle('ql-right', this.quill.root.offsetWidth - parseInt(cursor.elem.style.left) <= flag.offsetWidth);
    // } else {
    //   this.removeCursor(cursor.userId);
    // }
    if (!cursor || !cursor.range) return;

    var startRange = cursor.range.index;
    var endRange = cursor.range.index + cursor.range.length;

    // Check ranges
    if(endRange > this.quill.getLength() - 1)
      endRange = this.quill.getLength() - 1;

    var containerRect = this.quill.container.getBoundingClientRect();
    var startLeaf = this.quill.getLeaf(startRange);
    var endLeaf = this.quill.getLeaf(endRange);
    var range = document.createRange();
    var rects;

    // Sanity check
    if (!startLeaf || !endLeaf ||
      !startLeaf[0] || !endLeaf[0] ||
      startLeaf[1] < 0 || endLeaf[1] < 0 ||
      !startLeaf[0].domNode || !endLeaf[0].domNode) {

      console.warn('[quill-cursors] A cursor couldn\'t be updated (ID ' + cursor.userId + '), hiding.');

      this.hideCursor(cursor.userId);

      return;
    }

    range.setStart(startLeaf[0].domNode, startLeaf[1]);
    range.setEnd(endLeaf[0].domNode, endLeaf[1]);
    rects = rangeFix.getClientRects(range);

    this.updateCaret(cursor, endLeaf);
    this.updateSelection(cursor, rects, containerRect);

  }

  updateCaret(cursor, leaf) {
    var rect, index = cursor.range.index + cursor.range.length;

    // The only time a valid offset of 0 can occur is when the cursor is positioned
    // before the first character in a line, and it will be the case that the start
    // and end points of the range will be exactly the same... if they are not then
    // a block selection is taking place and we need to offset the character position
    // by -1;
    if (index > 0 && leaf[1] === 0 && cursor.range.index !== (cursor.range.index + cursor.range.length)) {
      index--;
    }

    rect = this.quill.getBounds(index);

    cursor.caretEl.style.top = (rect.top) + 'px';
    cursor.caretEl.style.left = (rect.left) + 'px';
    cursor.caretEl.style.height = rect.height + 'px';

    cursor.flagEl.style.top = (rect.top) + 'px';
    cursor.flagEl.style.left = (rect.left) + 'px';
  };

  updateSelection(cursor, rects, containerRect) {
    function createSelectionBlock(rect) {
      var selectionBlockEl = document.createElement('span');

      selectionBlockEl.classList.add('ql-cursor-selection-block');
      selectionBlockEl.style.top = (rect.top - containerRect.top) + 'px';
      selectionBlockEl.style.left = (rect.left - containerRect.left) + 'px';
      selectionBlockEl.style.width = rect.width + 'px';
      selectionBlockEl.style.height = rect.height + 'px';
      selectionBlockEl.style.backgroundColor = tinycolor(cursor.color).setAlpha(0.3).toString();

      return selectionBlockEl;
    }

    // Wipe the slate clean
    cursor.selectionEl.innerHTML = null;

    var index = [];
    var rectIndex;

    [].forEach.call(rects, function(rect) {
      rectIndex = ('' + rect.top + rect.left + rect.width + rect.height);

      // Note: Safari throws a rect with length 1 when caret with no selection.
      // A check was addedfor to avoid drawing those carets - they show up on blinking.
      if (!~index.indexOf(rectIndex) && rect.width > 1) {
        index.push(rectIndex);
        cursor.selectionEl.appendChild(createSelectionBlock(rect));
      }
    }, this);
  };
}
