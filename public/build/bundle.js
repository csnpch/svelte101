
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.55.1' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\components\Navbar.svelte generated by Svelte v3.55.1 */

    const file$6 = "src\\components\\Navbar.svelte";

    function create_fragment$6(ctx) {
    	let div1;
    	let div0;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = "Mini Service";
    			attr_dev(div0, "class", "navbar-logo-text");
    			add_location(div0, file$6, 2, 4, 38);
    			attr_dev(div1, "class", "container-navbar");
    			add_location(div1, file$6, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Navbar', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Navbar> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Navbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Navbar",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    const randomNumberBetween = (start, end) => { // min and max included 
        return Math.floor(Math.random() * (end - start + 1) + start)
    };


    const randomStringLength = (length) => {
        let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        return result;
    };


    var rand = {
        randomNumberBetween,
        randomStringLength
    };

    /* src\Services\sub-services\RandomNumBetween.svelte generated by Svelte v3.55.1 */
    const file$5 = "src\\Services\\sub-services\\RandomNumBetween.svelte";

    function create_fragment$5(ctx) {
    	let form;
    	let div0;
    	let p0;
    	let t1;
    	let div1;
    	let input0;
    	let t2;
    	let input1;
    	let t3;
    	let div3;
    	let button;
    	let t5;
    	let div2;
    	let p1;
    	let t6;
    	let t7_value = (/*resultRandNumBetween*/ ctx[2] || '-') + "";
    	let t7;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			form = element("form");
    			div0 = element("div");
    			p0 = element("p");
    			p0.textContent = "Random Number Between";
    			t1 = space();
    			div1 = element("div");
    			input0 = element("input");
    			t2 = space();
    			input1 = element("input");
    			t3 = space();
    			div3 = element("div");
    			button = element("button");
    			button.textContent = "Random";
    			t5 = space();
    			div2 = element("div");
    			p1 = element("p");
    			t6 = text("Result:  ");
    			t7 = text(t7_value);
    			add_location(p0, file$5, 25, 8, 710);
    			attr_dev(div0, "class", "title-service");
    			add_location(div0, file$5, 24, 4, 673);
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "placeholder", "Start");
    			input0.required = true;
    			add_location(input0, file$5, 28, 8, 792);
    			set_style(input1, "margin-top", "0.6rem");
    			attr_dev(input1, "type", "number");
    			attr_dev(input1, "placeholder", "End");
    			input1.required = true;
    			add_location(input1, file$5, 34, 8, 957);
    			attr_dev(div1, "class", "body-service");
    			add_location(div1, file$5, 27, 4, 756);
    			attr_dev(button, "class", "decorative-button");
    			add_location(button, file$5, 42, 8, 1190);
    			add_location(p1, file$5, 46, 12, 1343);
    			attr_dev(div2, "class", "result-service");
    			add_location(div2, file$5, 45, 8, 1301);
    			attr_dev(div3, "class", "action-service");
    			add_location(div3, file$5, 41, 4, 1152);
    			attr_dev(form, "class", "card-service");
    			attr_dev(form, "action", "#");
    			add_location(form, file$5, 23, 0, 629);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);
    			append_dev(form, div0);
    			append_dev(div0, p0);
    			append_dev(form, t1);
    			append_dev(form, div1);
    			append_dev(div1, input0);
    			set_input_value(input0, /*valueRandNumBetween_start*/ ctx[0]);
    			append_dev(div1, t2);
    			append_dev(div1, input1);
    			set_input_value(input1, /*valueRandNumBetween_end*/ ctx[1]);
    			append_dev(form, t3);
    			append_dev(form, div3);
    			append_dev(div3, button);
    			append_dev(div3, t5);
    			append_dev(div3, div2);
    			append_dev(div2, p1);
    			append_dev(p1, t6);
    			append_dev(p1, t7);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[4]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[5]),
    					listen_dev(button, "click", /*onRandNumBetween*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*valueRandNumBetween_start*/ 1 && to_number(input0.value) !== /*valueRandNumBetween_start*/ ctx[0]) {
    				set_input_value(input0, /*valueRandNumBetween_start*/ ctx[0]);
    			}

    			if (dirty & /*valueRandNumBetween_end*/ 2 && to_number(input1.value) !== /*valueRandNumBetween_end*/ ctx[1]) {
    				set_input_value(input1, /*valueRandNumBetween_end*/ ctx[1]);
    			}

    			if (dirty & /*resultRandNumBetween*/ 4 && t7_value !== (t7_value = (/*resultRandNumBetween*/ ctx[2] || '-') + "")) set_data_dev(t7, t7_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('RandomNumBetween', slots, []);
    	let valueRandNumBetween_start = null;
    	let valueRandNumBetween_end = null;
    	let resultRandNumBetween = null;

    	function onRandNumBetween() {
    		if (!valueRandNumBetween_start || !valueRandNumBetween_end) return;
    		$$invalidate(0, valueRandNumBetween_start = parseInt(valueRandNumBetween_start));
    		$$invalidate(1, valueRandNumBetween_end = parseInt(valueRandNumBetween_end));
    		$$invalidate(2, resultRandNumBetween = rand.randomNumberBetween(valueRandNumBetween_start, valueRandNumBetween_end));
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<RandomNumBetween> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		valueRandNumBetween_start = to_number(this.value);
    		$$invalidate(0, valueRandNumBetween_start);
    	}

    	function input1_input_handler() {
    		valueRandNumBetween_end = to_number(this.value);
    		$$invalidate(1, valueRandNumBetween_end);
    	}

    	$$self.$capture_state = () => ({
    		rand,
    		valueRandNumBetween_start,
    		valueRandNumBetween_end,
    		resultRandNumBetween,
    		onRandNumBetween
    	});

    	$$self.$inject_state = $$props => {
    		if ('valueRandNumBetween_start' in $$props) $$invalidate(0, valueRandNumBetween_start = $$props.valueRandNumBetween_start);
    		if ('valueRandNumBetween_end' in $$props) $$invalidate(1, valueRandNumBetween_end = $$props.valueRandNumBetween_end);
    		if ('resultRandNumBetween' in $$props) $$invalidate(2, resultRandNumBetween = $$props.resultRandNumBetween);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		valueRandNumBetween_start,
    		valueRandNumBetween_end,
    		resultRandNumBetween,
    		onRandNumBetween,
    		input0_input_handler,
    		input1_input_handler
    	];
    }

    class RandomNumBetween extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "RandomNumBetween",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    /*!
    * sweetalert2 v11.7.2
    * Released under the MIT License.
    */

    var sweetalert2_all = createCommonjsModule(function (module, exports) {
    (function (global, factory) {
      module.exports = factory() ;
    })(commonjsGlobal, (function () {
      /**
       * This module contains `WeakMap`s for each effectively-"private  property" that a `Swal` has.
       * For example, to set the private property "foo" of `this` to "bar", you can `privateProps.foo.set(this, 'bar')`
       * This is the approach that Babel will probably take to implement private methods/fields
       *   https://github.com/tc39/proposal-private-methods
       *   https://github.com/babel/babel/pull/7555
       * Once we have the changes from that PR in Babel, and our core class fits reasonable in *one module*
       *   then we can use that language feature.
       */

      var privateProps = {
        awaitingPromise: new WeakMap(),
        promise: new WeakMap(),
        innerParams: new WeakMap(),
        domCache: new WeakMap()
      };

      const swalPrefix = 'swal2-';

      /**
       * @param {string[]} items
       * @returns {object}
       */
      const prefix = items => {
        const result = {};
        for (const i in items) {
          result[items[i]] = swalPrefix + items[i];
        }
        return result;
      };
      const swalClasses = prefix(['container', 'shown', 'height-auto', 'iosfix', 'popup', 'modal', 'no-backdrop', 'no-transition', 'toast', 'toast-shown', 'show', 'hide', 'close', 'title', 'html-container', 'actions', 'confirm', 'deny', 'cancel', 'default-outline', 'footer', 'icon', 'icon-content', 'image', 'input', 'file', 'range', 'select', 'radio', 'checkbox', 'label', 'textarea', 'inputerror', 'input-label', 'validation-message', 'progress-steps', 'active-progress-step', 'progress-step', 'progress-step-line', 'loader', 'loading', 'styled', 'top', 'top-start', 'top-end', 'top-left', 'top-right', 'center', 'center-start', 'center-end', 'center-left', 'center-right', 'bottom', 'bottom-start', 'bottom-end', 'bottom-left', 'bottom-right', 'grow-row', 'grow-column', 'grow-fullscreen', 'rtl', 'timer-progress-bar', 'timer-progress-bar-container', 'scrollbar-measure', 'icon-success', 'icon-warning', 'icon-info', 'icon-question', 'icon-error']);
      const iconTypes = prefix(['success', 'warning', 'info', 'question', 'error']);

      const consolePrefix = 'SweetAlert2:';

      /**
       * Filter the unique values into a new array
       *
       * @param {Array} arr
       * @returns {Array}
       */
      const uniqueArray = arr => {
        const result = [];
        for (let i = 0; i < arr.length; i++) {
          if (result.indexOf(arr[i]) === -1) {
            result.push(arr[i]);
          }
        }
        return result;
      };

      /**
       * Capitalize the first letter of a string
       *
       * @param {string} str
       * @returns {string}
       */
      const capitalizeFirstLetter = str => str.charAt(0).toUpperCase() + str.slice(1);

      /**
       * Standardize console warnings
       *
       * @param {string | Array} message
       */
      const warn = message => {
        console.warn(`${consolePrefix} ${typeof message === 'object' ? message.join(' ') : message}`);
      };

      /**
       * Standardize console errors
       *
       * @param {string} message
       */
      const error = message => {
        console.error(`${consolePrefix} ${message}`);
      };

      /**
       * Private global state for `warnOnce`
       *
       * @type {Array}
       * @private
       */
      const previousWarnOnceMessages = [];

      /**
       * Show a console warning, but only if it hasn't already been shown
       *
       * @param {string} message
       */
      const warnOnce = message => {
        if (!previousWarnOnceMessages.includes(message)) {
          previousWarnOnceMessages.push(message);
          warn(message);
        }
      };

      /**
       * Show a one-time console warning about deprecated params/methods
       *
       * @param {string} deprecatedParam
       * @param {string} useInstead
       */
      const warnAboutDeprecation = (deprecatedParam, useInstead) => {
        warnOnce(`"${deprecatedParam}" is deprecated and will be removed in the next major release. Please use "${useInstead}" instead.`);
      };

      /**
       * If `arg` is a function, call it (with no arguments or context) and return the result.
       * Otherwise, just pass the value through
       *
       * @param {Function | any} arg
       * @returns {any}
       */
      const callIfFunction = arg => typeof arg === 'function' ? arg() : arg;

      /**
       * @param {any} arg
       * @returns {boolean}
       */
      const hasToPromiseFn = arg => arg && typeof arg.toPromise === 'function';

      /**
       * @param {any} arg
       * @returns {Promise}
       */
      const asPromise = arg => hasToPromiseFn(arg) ? arg.toPromise() : Promise.resolve(arg);

      /**
       * @param {any} arg
       * @returns {boolean}
       */
      const isPromise = arg => arg && Promise.resolve(arg) === arg;

      /**
       * Gets the popup container which contains the backdrop and the popup itself.
       *
       * @returns {HTMLElement | null}
       */
      const getContainer = () => document.body.querySelector(`.${swalClasses.container}`);

      /**
       * @param {string} selectorString
       * @returns {HTMLElement | null}
       */
      const elementBySelector = selectorString => {
        const container = getContainer();
        return container ? container.querySelector(selectorString) : null;
      };

      /**
       * @param {string} className
       * @returns {HTMLElement | null}
       */
      const elementByClass = className => {
        return elementBySelector(`.${className}`);
      };

      /**
       * @returns {HTMLElement | null}
       */
      const getPopup = () => elementByClass(swalClasses.popup);

      /**
       * @returns {HTMLElement | null}
       */
      const getIcon = () => elementByClass(swalClasses.icon);

      /**
       * @returns {HTMLElement | null}
       */
      const getIconContent = () => elementByClass(swalClasses['icon-content']);

      /**
       * @returns {HTMLElement | null}
       */
      const getTitle = () => elementByClass(swalClasses.title);

      /**
       * @returns {HTMLElement | null}
       */
      const getHtmlContainer = () => elementByClass(swalClasses['html-container']);

      /**
       * @returns {HTMLElement | null}
       */
      const getImage = () => elementByClass(swalClasses.image);

      /**
       * @returns {HTMLElement | null}
       */
      const getProgressSteps = () => elementByClass(swalClasses['progress-steps']);

      /**
       * @returns {HTMLElement | null}
       */
      const getValidationMessage = () => elementByClass(swalClasses['validation-message']);

      /**
       * @returns {HTMLButtonElement | null}
       */
      const getConfirmButton = () => /** @type {HTMLButtonElement} */elementBySelector(`.${swalClasses.actions} .${swalClasses.confirm}`);

      /**
       * @returns {HTMLButtonElement | null}
       */
      const getCancelButton = () => /** @type {HTMLButtonElement} */elementBySelector(`.${swalClasses.actions} .${swalClasses.cancel}`);

      /**
       * @returns {HTMLButtonElement | null}
       */
      const getDenyButton = () => /** @type {HTMLButtonElement} */elementBySelector(`.${swalClasses.actions} .${swalClasses.deny}`);

      /**
       * @returns {HTMLElement | null}
       */
      const getInputLabel = () => elementByClass(swalClasses['input-label']);

      /**
       * @returns {HTMLElement | null}
       */
      const getLoader = () => elementBySelector(`.${swalClasses.loader}`);

      /**
       * @returns {HTMLElement | null}
       */
      const getActions = () => elementByClass(swalClasses.actions);

      /**
       * @returns {HTMLElement | null}
       */
      const getFooter = () => elementByClass(swalClasses.footer);

      /**
       * @returns {HTMLElement | null}
       */
      const getTimerProgressBar = () => elementByClass(swalClasses['timer-progress-bar']);

      /**
       * @returns {HTMLElement | null}
       */
      const getCloseButton = () => elementByClass(swalClasses.close);

      // https://github.com/jkup/focusable/blob/master/index.js
      const focusable = `
  a[href],
  area[href],
  input:not([disabled]),
  select:not([disabled]),
  textarea:not([disabled]),
  button:not([disabled]),
  iframe,
  object,
  embed,
  [tabindex="0"],
  [contenteditable],
  audio[controls],
  video[controls],
  summary
`;
      /**
       * @returns {HTMLElement[]}
       */
      const getFocusableElements = () => {
        const focusableElementsWithTabindex = Array.from(getPopup().querySelectorAll('[tabindex]:not([tabindex="-1"]):not([tabindex="0"])'))
        // sort according to tabindex
        .sort((a, b) => {
          const tabindexA = parseInt(a.getAttribute('tabindex'));
          const tabindexB = parseInt(b.getAttribute('tabindex'));
          if (tabindexA > tabindexB) {
            return 1;
          } else if (tabindexA < tabindexB) {
            return -1;
          }
          return 0;
        });
        const otherFocusableElements = Array.from(getPopup().querySelectorAll(focusable)).filter(el => el.getAttribute('tabindex') !== '-1');
        return uniqueArray(focusableElementsWithTabindex.concat(otherFocusableElements)).filter(el => isVisible$1(el));
      };

      /**
       * @returns {boolean}
       */
      const isModal = () => {
        return hasClass(document.body, swalClasses.shown) && !hasClass(document.body, swalClasses['toast-shown']) && !hasClass(document.body, swalClasses['no-backdrop']);
      };

      /**
       * @returns {boolean}
       */
      const isToast = () => {
        return getPopup() && hasClass(getPopup(), swalClasses.toast);
      };

      /**
       * @returns {boolean}
       */
      const isLoading = () => {
        return getPopup().hasAttribute('data-loading');
      };

      // Remember state in cases where opening and handling a modal will fiddle with it.
      const states = {
        previousBodyPadding: null
      };

      /**
       * Securely set innerHTML of an element
       * https://github.com/sweetalert2/sweetalert2/issues/1926
       *
       * @param {HTMLElement} elem
       * @param {string} html
       */
      const setInnerHtml = (elem, html) => {
        elem.textContent = '';
        if (html) {
          const parser = new DOMParser();
          const parsed = parser.parseFromString(html, `text/html`);
          Array.from(parsed.querySelector('head').childNodes).forEach(child => {
            elem.appendChild(child);
          });
          Array.from(parsed.querySelector('body').childNodes).forEach(child => {
            if (child instanceof HTMLVideoElement || child instanceof HTMLAudioElement) {
              elem.appendChild(child.cloneNode(true)); // https://github.com/sweetalert2/sweetalert2/issues/2507
            } else {
              elem.appendChild(child);
            }
          });
        }
      };

      /**
       * @param {HTMLElement} elem
       * @param {string} className
       * @returns {boolean}
       */
      const hasClass = (elem, className) => {
        if (!className) {
          return false;
        }
        const classList = className.split(/\s+/);
        for (let i = 0; i < classList.length; i++) {
          if (!elem.classList.contains(classList[i])) {
            return false;
          }
        }
        return true;
      };

      /**
       * @param {HTMLElement} elem
       * @param {SweetAlertOptions} params
       */
      const removeCustomClasses = (elem, params) => {
        Array.from(elem.classList).forEach(className => {
          if (!Object.values(swalClasses).includes(className) && !Object.values(iconTypes).includes(className) && !Object.values(params.showClass).includes(className)) {
            elem.classList.remove(className);
          }
        });
      };

      /**
       * @param {HTMLElement} elem
       * @param {SweetAlertOptions} params
       * @param {string} className
       */
      const applyCustomClass = (elem, params, className) => {
        removeCustomClasses(elem, params);
        if (params.customClass && params.customClass[className]) {
          if (typeof params.customClass[className] !== 'string' && !params.customClass[className].forEach) {
            warn(`Invalid type of customClass.${className}! Expected string or iterable object, got "${typeof params.customClass[className]}"`);
            return;
          }
          addClass(elem, params.customClass[className]);
        }
      };

      /**
       * @param {HTMLElement} popup
       * @param {import('./renderers/renderInput').InputClass} inputClass
       * @returns {HTMLInputElement | null}
       */
      const getInput$1 = (popup, inputClass) => {
        if (!inputClass) {
          return null;
        }
        switch (inputClass) {
          case 'select':
          case 'textarea':
          case 'file':
            return popup.querySelector(`.${swalClasses.popup} > .${swalClasses[inputClass]}`);
          case 'checkbox':
            return popup.querySelector(`.${swalClasses.popup} > .${swalClasses.checkbox} input`);
          case 'radio':
            return popup.querySelector(`.${swalClasses.popup} > .${swalClasses.radio} input:checked`) || popup.querySelector(`.${swalClasses.popup} > .${swalClasses.radio} input:first-child`);
          case 'range':
            return popup.querySelector(`.${swalClasses.popup} > .${swalClasses.range} input`);
          default:
            return popup.querySelector(`.${swalClasses.popup} > .${swalClasses.input}`);
        }
      };

      /**
       * @param {HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement} input
       */
      const focusInput = input => {
        input.focus();

        // place cursor at end of text in text input
        if (input.type !== 'file') {
          // http://stackoverflow.com/a/2345915
          const val = input.value;
          input.value = '';
          input.value = val;
        }
      };

      /**
       * @param {HTMLElement | HTMLElement[] | null} target
       * @param {string | string[] | readonly string[]} classList
       * @param {boolean} condition
       */
      const toggleClass = (target, classList, condition) => {
        if (!target || !classList) {
          return;
        }
        if (typeof classList === 'string') {
          classList = classList.split(/\s+/).filter(Boolean);
        }
        classList.forEach(className => {
          if (Array.isArray(target)) {
            target.forEach(elem => {
              condition ? elem.classList.add(className) : elem.classList.remove(className);
            });
          } else {
            condition ? target.classList.add(className) : target.classList.remove(className);
          }
        });
      };

      /**
       * @param {HTMLElement | HTMLElement[] | null} target
       * @param {string | string[] | readonly string[]} classList
       */
      const addClass = (target, classList) => {
        toggleClass(target, classList, true);
      };

      /**
       * @param {HTMLElement | HTMLElement[] | null} target
       * @param {string | string[] | readonly string[]} classList
       */
      const removeClass = (target, classList) => {
        toggleClass(target, classList, false);
      };

      /**
       * Get direct child of an element by class name
       *
       * @param {HTMLElement} elem
       * @param {string} className
       * @returns {HTMLElement | undefined}
       */
      const getDirectChildByClass = (elem, className) => {
        const children = Array.from(elem.children);
        for (let i = 0; i < children.length; i++) {
          const child = children[i];
          if (child instanceof HTMLElement && hasClass(child, className)) {
            return child;
          }
        }
      };

      /**
       * @param {HTMLElement} elem
       * @param {string} property
       * @param {*} value
       */
      const applyNumericalStyle = (elem, property, value) => {
        if (value === `${parseInt(value)}`) {
          value = parseInt(value);
        }
        if (value || parseInt(value) === 0) {
          elem.style[property] = typeof value === 'number' ? `${value}px` : value;
        } else {
          elem.style.removeProperty(property);
        }
      };

      /**
       * @param {HTMLElement} elem
       * @param {string} display
       */
      const show = function (elem) {
        let display = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'flex';
        elem.style.display = display;
      };

      /**
       * @param {HTMLElement} elem
       */
      const hide = elem => {
        elem.style.display = 'none';
      };

      /**
       * @param {HTMLElement} parent
       * @param {string} selector
       * @param {string} property
       * @param {string} value
       */
      const setStyle = (parent, selector, property, value) => {
        /** @type {HTMLElement} */
        const el = parent.querySelector(selector);
        if (el) {
          el.style[property] = value;
        }
      };

      /**
       * @param {HTMLElement} elem
       * @param {any} condition
       * @param {string} display
       */
      const toggle = function (elem, condition) {
        let display = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'flex';
        condition ? show(elem, display) : hide(elem);
      };

      /**
       * borrowed from jquery $(elem).is(':visible') implementation
       *
       * @param {HTMLElement} elem
       * @returns {boolean}
       */
      const isVisible$1 = elem => !!(elem && (elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length));

      /**
       * @returns {boolean}
       */
      const allButtonsAreHidden = () => !isVisible$1(getConfirmButton()) && !isVisible$1(getDenyButton()) && !isVisible$1(getCancelButton());

      /**
       * @param {HTMLElement} elem
       * @returns {boolean}
       */
      const isScrollable = elem => !!(elem.scrollHeight > elem.clientHeight);

      /**
       * borrowed from https://stackoverflow.com/a/46352119
       *
       * @param {HTMLElement} elem
       * @returns {boolean}
       */
      const hasCssAnimation = elem => {
        const style = window.getComputedStyle(elem);
        const animDuration = parseFloat(style.getPropertyValue('animation-duration') || '0');
        const transDuration = parseFloat(style.getPropertyValue('transition-duration') || '0');
        return animDuration > 0 || transDuration > 0;
      };

      /**
       * @param {number} timer
       * @param {boolean} reset
       */
      const animateTimerProgressBar = function (timer) {
        let reset = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
        const timerProgressBar = getTimerProgressBar();
        if (isVisible$1(timerProgressBar)) {
          if (reset) {
            timerProgressBar.style.transition = 'none';
            timerProgressBar.style.width = '100%';
          }
          setTimeout(() => {
            timerProgressBar.style.transition = `width ${timer / 1000}s linear`;
            timerProgressBar.style.width = '0%';
          }, 10);
        }
      };
      const stopTimerProgressBar = () => {
        const timerProgressBar = getTimerProgressBar();
        const timerProgressBarWidth = parseInt(window.getComputedStyle(timerProgressBar).width);
        timerProgressBar.style.removeProperty('transition');
        timerProgressBar.style.width = '100%';
        const timerProgressBarFullWidth = parseInt(window.getComputedStyle(timerProgressBar).width);
        const timerProgressBarPercent = timerProgressBarWidth / timerProgressBarFullWidth * 100;
        timerProgressBar.style.width = `${timerProgressBarPercent}%`;
      };

      const RESTORE_FOCUS_TIMEOUT = 100;

      /** @type {GlobalState} */
      const globalState = {};
      const focusPreviousActiveElement = () => {
        if (globalState.previousActiveElement instanceof HTMLElement) {
          globalState.previousActiveElement.focus();
          globalState.previousActiveElement = null;
        } else if (document.body) {
          document.body.focus();
        }
      };

      /**
       * Restore previous active (focused) element
       *
       * @param {boolean} returnFocus
       * @returns {Promise}
       */
      const restoreActiveElement = returnFocus => {
        return new Promise(resolve => {
          if (!returnFocus) {
            return resolve();
          }
          const x = window.scrollX;
          const y = window.scrollY;
          globalState.restoreFocusTimeout = setTimeout(() => {
            focusPreviousActiveElement();
            resolve();
          }, RESTORE_FOCUS_TIMEOUT); // issues/900

          window.scrollTo(x, y);
        });
      };

      /**
       * Detect Node env
       *
       * @returns {boolean}
       */
      const isNodeEnv = () => typeof window === 'undefined' || typeof document === 'undefined';

      const sweetHTML = `
 <div aria-labelledby="${swalClasses.title}" aria-describedby="${swalClasses['html-container']}" class="${swalClasses.popup}" tabindex="-1">
   <button type="button" class="${swalClasses.close}"></button>
   <ul class="${swalClasses['progress-steps']}"></ul>
   <div class="${swalClasses.icon}"></div>
   <img class="${swalClasses.image}" />
   <h2 class="${swalClasses.title}" id="${swalClasses.title}"></h2>
   <div class="${swalClasses['html-container']}" id="${swalClasses['html-container']}"></div>
   <input class="${swalClasses.input}" />
   <input type="file" class="${swalClasses.file}" />
   <div class="${swalClasses.range}">
     <input type="range" />
     <output></output>
   </div>
   <select class="${swalClasses.select}"></select>
   <div class="${swalClasses.radio}"></div>
   <label for="${swalClasses.checkbox}" class="${swalClasses.checkbox}">
     <input type="checkbox" />
     <span class="${swalClasses.label}"></span>
   </label>
   <textarea class="${swalClasses.textarea}"></textarea>
   <div class="${swalClasses['validation-message']}" id="${swalClasses['validation-message']}"></div>
   <div class="${swalClasses.actions}">
     <div class="${swalClasses.loader}"></div>
     <button type="button" class="${swalClasses.confirm}"></button>
     <button type="button" class="${swalClasses.deny}"></button>
     <button type="button" class="${swalClasses.cancel}"></button>
   </div>
   <div class="${swalClasses.footer}"></div>
   <div class="${swalClasses['timer-progress-bar-container']}">
     <div class="${swalClasses['timer-progress-bar']}"></div>
   </div>
 </div>
`.replace(/(^|\n)\s*/g, '');

      /**
       * @returns {boolean}
       */
      const resetOldContainer = () => {
        const oldContainer = getContainer();
        if (!oldContainer) {
          return false;
        }
        oldContainer.remove();
        removeClass([document.documentElement, document.body], [swalClasses['no-backdrop'], swalClasses['toast-shown'], swalClasses['has-column']]);
        return true;
      };
      const resetValidationMessage$1 = () => {
        globalState.currentInstance.resetValidationMessage();
      };
      const addInputChangeListeners = () => {
        const popup = getPopup();
        const input = getDirectChildByClass(popup, swalClasses.input);
        const file = getDirectChildByClass(popup, swalClasses.file);
        /** @type {HTMLInputElement} */
        const range = popup.querySelector(`.${swalClasses.range} input`);
        /** @type {HTMLOutputElement} */
        const rangeOutput = popup.querySelector(`.${swalClasses.range} output`);
        const select = getDirectChildByClass(popup, swalClasses.select);
        /** @type {HTMLInputElement} */
        const checkbox = popup.querySelector(`.${swalClasses.checkbox} input`);
        const textarea = getDirectChildByClass(popup, swalClasses.textarea);
        input.oninput = resetValidationMessage$1;
        file.onchange = resetValidationMessage$1;
        select.onchange = resetValidationMessage$1;
        checkbox.onchange = resetValidationMessage$1;
        textarea.oninput = resetValidationMessage$1;
        range.oninput = () => {
          resetValidationMessage$1();
          rangeOutput.value = range.value;
        };
        range.onchange = () => {
          resetValidationMessage$1();
          rangeOutput.value = range.value;
        };
      };

      /**
       * @param {string | HTMLElement} target
       * @returns {HTMLElement}
       */
      const getTarget = target => typeof target === 'string' ? document.querySelector(target) : target;

      /**
       * @param {SweetAlertOptions} params
       */
      const setupAccessibility = params => {
        const popup = getPopup();
        popup.setAttribute('role', params.toast ? 'alert' : 'dialog');
        popup.setAttribute('aria-live', params.toast ? 'polite' : 'assertive');
        if (!params.toast) {
          popup.setAttribute('aria-modal', 'true');
        }
      };

      /**
       * @param {HTMLElement} targetElement
       */
      const setupRTL = targetElement => {
        if (window.getComputedStyle(targetElement).direction === 'rtl') {
          addClass(getContainer(), swalClasses.rtl);
        }
      };

      /**
       * Add modal + backdrop + no-war message for Russians to DOM
       *
       * @param {SweetAlertOptions} params
       */
      const init = params => {
        // Clean up the old popup container if it exists
        const oldContainerExisted = resetOldContainer();

        /* istanbul ignore if */
        if (isNodeEnv()) {
          error('SweetAlert2 requires document to initialize');
          return;
        }
        const container = document.createElement('div');
        container.className = swalClasses.container;
        if (oldContainerExisted) {
          addClass(container, swalClasses['no-transition']);
        }
        setInnerHtml(container, sweetHTML);
        const targetElement = getTarget(params.target);
        targetElement.appendChild(container);
        setupAccessibility(params);
        setupRTL(targetElement);
        addInputChangeListeners();
      };

      /**
       * @param {HTMLElement | object | string} param
       * @param {HTMLElement} target
       */
      const parseHtmlToContainer = (param, target) => {
        // DOM element
        if (param instanceof HTMLElement) {
          target.appendChild(param);
        }

        // Object
        else if (typeof param === 'object') {
          handleObject(param, target);
        }

        // Plain string
        else if (param) {
          setInnerHtml(target, param);
        }
      };

      /**
       * @param {object} param
       * @param {HTMLElement} target
       */
      const handleObject = (param, target) => {
        // JQuery element(s)
        if (param.jquery) {
          handleJqueryElem(target, param);
        }

        // For other objects use their string representation
        else {
          setInnerHtml(target, param.toString());
        }
      };

      /**
       * @param {HTMLElement} target
       * @param {HTMLElement} elem
       */
      const handleJqueryElem = (target, elem) => {
        target.textContent = '';
        if (0 in elem) {
          for (let i = 0; (i in elem); i++) {
            target.appendChild(elem[i].cloneNode(true));
          }
        } else {
          target.appendChild(elem.cloneNode(true));
        }
      };

      /**
       * @returns {'webkitAnimationEnd' | 'animationend' | false}
       */
      const animationEndEvent = (() => {
        // Prevent run in Node env
        /* istanbul ignore if */
        if (isNodeEnv()) {
          return false;
        }
        const testEl = document.createElement('div');
        const transEndEventNames = {
          WebkitAnimation: 'webkitAnimationEnd',
          // Chrome, Safari and Opera
          animation: 'animationend' // Standard syntax
        };

        for (const i in transEndEventNames) {
          if (Object.prototype.hasOwnProperty.call(transEndEventNames, i) && typeof testEl.style[i] !== 'undefined') {
            return transEndEventNames[i];
          }
        }
        return false;
      })();

      /**
       * Measure scrollbar width for padding body during modal show/hide
       * https://github.com/twbs/bootstrap/blob/master/js/src/modal.js
       *
       * @returns {number}
       */
      const measureScrollbar = () => {
        const scrollDiv = document.createElement('div');
        scrollDiv.className = swalClasses['scrollbar-measure'];
        document.body.appendChild(scrollDiv);
        const scrollbarWidth = scrollDiv.getBoundingClientRect().width - scrollDiv.clientWidth;
        document.body.removeChild(scrollDiv);
        return scrollbarWidth;
      };

      /**
       * @param {SweetAlert2} instance
       * @param {SweetAlertOptions} params
       */
      const renderActions = (instance, params) => {
        const actions = getActions();
        const loader = getLoader();

        // Actions (buttons) wrapper
        if (!params.showConfirmButton && !params.showDenyButton && !params.showCancelButton) {
          hide(actions);
        } else {
          show(actions);
        }

        // Custom class
        applyCustomClass(actions, params, 'actions');

        // Render all the buttons
        renderButtons(actions, loader, params);

        // Loader
        setInnerHtml(loader, params.loaderHtml);
        applyCustomClass(loader, params, 'loader');
      };

      /**
       * @param {HTMLElement} actions
       * @param {HTMLElement} loader
       * @param {SweetAlertOptions} params
       */
      function renderButtons(actions, loader, params) {
        const confirmButton = getConfirmButton();
        const denyButton = getDenyButton();
        const cancelButton = getCancelButton();

        // Render buttons
        renderButton(confirmButton, 'confirm', params);
        renderButton(denyButton, 'deny', params);
        renderButton(cancelButton, 'cancel', params);
        handleButtonsStyling(confirmButton, denyButton, cancelButton, params);
        if (params.reverseButtons) {
          if (params.toast) {
            actions.insertBefore(cancelButton, confirmButton);
            actions.insertBefore(denyButton, confirmButton);
          } else {
            actions.insertBefore(cancelButton, loader);
            actions.insertBefore(denyButton, loader);
            actions.insertBefore(confirmButton, loader);
          }
        }
      }

      /**
       * @param {HTMLElement} confirmButton
       * @param {HTMLElement} denyButton
       * @param {HTMLElement} cancelButton
       * @param {SweetAlertOptions} params
       */
      function handleButtonsStyling(confirmButton, denyButton, cancelButton, params) {
        if (!params.buttonsStyling) {
          removeClass([confirmButton, denyButton, cancelButton], swalClasses.styled);
          return;
        }
        addClass([confirmButton, denyButton, cancelButton], swalClasses.styled);

        // Buttons background colors
        if (params.confirmButtonColor) {
          confirmButton.style.backgroundColor = params.confirmButtonColor;
          addClass(confirmButton, swalClasses['default-outline']);
        }
        if (params.denyButtonColor) {
          denyButton.style.backgroundColor = params.denyButtonColor;
          addClass(denyButton, swalClasses['default-outline']);
        }
        if (params.cancelButtonColor) {
          cancelButton.style.backgroundColor = params.cancelButtonColor;
          addClass(cancelButton, swalClasses['default-outline']);
        }
      }

      /**
       * @param {HTMLElement} button
       * @param {'confirm' | 'deny' | 'cancel'} buttonType
       * @param {SweetAlertOptions} params
       */
      function renderButton(button, buttonType, params) {
        toggle(button, params[`show${capitalizeFirstLetter(buttonType)}Button`], 'inline-block');
        setInnerHtml(button, params[`${buttonType}ButtonText`]); // Set caption text
        button.setAttribute('aria-label', params[`${buttonType}ButtonAriaLabel`]); // ARIA label

        // Add buttons custom classes
        button.className = swalClasses[buttonType];
        applyCustomClass(button, params, `${buttonType}Button`);
        addClass(button, params[`${buttonType}ButtonClass`]);
      }

      /**
       * @param {SweetAlert2} instance
       * @param {SweetAlertOptions} params
       */
      const renderCloseButton = (instance, params) => {
        const closeButton = getCloseButton();
        setInnerHtml(closeButton, params.closeButtonHtml);

        // Custom class
        applyCustomClass(closeButton, params, 'closeButton');
        toggle(closeButton, params.showCloseButton);
        closeButton.setAttribute('aria-label', params.closeButtonAriaLabel);
      };

      /**
       * @param {SweetAlert2} instance
       * @param {SweetAlertOptions} params
       */
      const renderContainer = (instance, params) => {
        const container = getContainer();
        if (!container) {
          return;
        }
        handleBackdropParam(container, params.backdrop);
        handlePositionParam(container, params.position);
        handleGrowParam(container, params.grow);

        // Custom class
        applyCustomClass(container, params, 'container');
      };

      /**
       * @param {HTMLElement} container
       * @param {SweetAlertOptions['backdrop']} backdrop
       */
      function handleBackdropParam(container, backdrop) {
        if (typeof backdrop === 'string') {
          container.style.background = backdrop;
        } else if (!backdrop) {
          addClass([document.documentElement, document.body], swalClasses['no-backdrop']);
        }
      }

      /**
       * @param {HTMLElement} container
       * @param {SweetAlertOptions['position']} position
       */
      function handlePositionParam(container, position) {
        if (position in swalClasses) {
          addClass(container, swalClasses[position]);
        } else {
          warn('The "position" parameter is not valid, defaulting to "center"');
          addClass(container, swalClasses.center);
        }
      }

      /**
       * @param {HTMLElement} container
       * @param {SweetAlertOptions['grow']} grow
       */
      function handleGrowParam(container, grow) {
        if (grow && typeof grow === 'string') {
          const growClass = `grow-${grow}`;
          if (growClass in swalClasses) {
            addClass(container, swalClasses[growClass]);
          }
        }
      }

      /// <reference path="../../../../sweetalert2.d.ts"/>

      /** @type {InputClass[]} */
      const inputClasses = ['input', 'file', 'range', 'select', 'radio', 'checkbox', 'textarea'];

      /**
       * @param {SweetAlert2} instance
       * @param {SweetAlertOptions} params
       */
      const renderInput = (instance, params) => {
        const popup = getPopup();
        const innerParams = privateProps.innerParams.get(instance);
        const rerender = !innerParams || params.input !== innerParams.input;
        inputClasses.forEach(inputClass => {
          const inputContainer = getDirectChildByClass(popup, swalClasses[inputClass]);

          // set attributes
          setAttributes(inputClass, params.inputAttributes);

          // set class
          inputContainer.className = swalClasses[inputClass];
          if (rerender) {
            hide(inputContainer);
          }
        });
        if (params.input) {
          if (rerender) {
            showInput(params);
          }
          // set custom class
          setCustomClass(params);
        }
      };

      /**
       * @param {SweetAlertOptions} params
       */
      const showInput = params => {
        if (!renderInputType[params.input]) {
          error(`Unexpected type of input! Expected "text", "email", "password", "number", "tel", "select", "radio", "checkbox", "textarea", "file" or "url", got "${params.input}"`);
          return;
        }
        const inputContainer = getInputContainer(params.input);
        const input = renderInputType[params.input](inputContainer, params);
        show(inputContainer);

        // input autofocus
        if (params.inputAutoFocus) {
          setTimeout(() => {
            focusInput(input);
          });
        }
      };

      /**
       * @param {HTMLInputElement} input
       */
      const removeAttributes = input => {
        for (let i = 0; i < input.attributes.length; i++) {
          const attrName = input.attributes[i].name;
          if (!['type', 'value', 'style'].includes(attrName)) {
            input.removeAttribute(attrName);
          }
        }
      };

      /**
       * @param {InputClass} inputClass
       * @param {SweetAlertOptions['inputAttributes']} inputAttributes
       */
      const setAttributes = (inputClass, inputAttributes) => {
        const input = getInput$1(getPopup(), inputClass);
        if (!input) {
          return;
        }
        removeAttributes(input);
        for (const attr in inputAttributes) {
          input.setAttribute(attr, inputAttributes[attr]);
        }
      };

      /**
       * @param {SweetAlertOptions} params
       */
      const setCustomClass = params => {
        const inputContainer = getInputContainer(params.input);
        if (typeof params.customClass === 'object') {
          addClass(inputContainer, params.customClass.input);
        }
      };

      /**
       * @param {HTMLInputElement | HTMLTextAreaElement} input
       * @param {SweetAlertOptions} params
       */
      const setInputPlaceholder = (input, params) => {
        if (!input.placeholder || params.inputPlaceholder) {
          input.placeholder = params.inputPlaceholder;
        }
      };

      /**
       * @param {Input} input
       * @param {Input} prependTo
       * @param {SweetAlertOptions} params
       */
      const setInputLabel = (input, prependTo, params) => {
        if (params.inputLabel) {
          input.id = swalClasses.input;
          const label = document.createElement('label');
          const labelClass = swalClasses['input-label'];
          label.setAttribute('for', input.id);
          label.className = labelClass;
          if (typeof params.customClass === 'object') {
            addClass(label, params.customClass.inputLabel);
          }
          label.innerText = params.inputLabel;
          prependTo.insertAdjacentElement('beforebegin', label);
        }
      };

      /**
       * @param {SweetAlertOptions['input']} inputType
       * @returns {HTMLElement}
       */
      const getInputContainer = inputType => {
        return getDirectChildByClass(getPopup(), swalClasses[inputType] || swalClasses.input);
      };

      /**
       * @param {HTMLInputElement | HTMLOutputElement | HTMLTextAreaElement} input
       * @param {SweetAlertOptions['inputValue']} inputValue
       */
      const checkAndSetInputValue = (input, inputValue) => {
        if (['string', 'number'].includes(typeof inputValue)) {
          input.value = `${inputValue}`;
        } else if (!isPromise(inputValue)) {
          warn(`Unexpected type of inputValue! Expected "string", "number" or "Promise", got "${typeof inputValue}"`);
        }
      };

      /** @type {Record<string, (input: Input | HTMLElement, params: SweetAlertOptions) => Input>} */
      const renderInputType = {};

      /**
       * @param {HTMLInputElement} input
       * @param {SweetAlertOptions} params
       * @returns {HTMLInputElement}
       */
      renderInputType.text = renderInputType.email = renderInputType.password = renderInputType.number = renderInputType.tel = renderInputType.url = (input, params) => {
        checkAndSetInputValue(input, params.inputValue);
        setInputLabel(input, input, params);
        setInputPlaceholder(input, params);
        input.type = params.input;
        return input;
      };

      /**
       * @param {HTMLInputElement} input
       * @param {SweetAlertOptions} params
       * @returns {HTMLInputElement}
       */
      renderInputType.file = (input, params) => {
        setInputLabel(input, input, params);
        setInputPlaceholder(input, params);
        return input;
      };

      /**
       * @param {HTMLInputElement} range
       * @param {SweetAlertOptions} params
       * @returns {HTMLInputElement}
       */
      renderInputType.range = (range, params) => {
        const rangeInput = range.querySelector('input');
        const rangeOutput = range.querySelector('output');
        checkAndSetInputValue(rangeInput, params.inputValue);
        rangeInput.type = params.input;
        checkAndSetInputValue(rangeOutput, params.inputValue);
        setInputLabel(rangeInput, range, params);
        return range;
      };

      /**
       * @param {HTMLSelectElement} select
       * @param {SweetAlertOptions} params
       * @returns {HTMLSelectElement}
       */
      renderInputType.select = (select, params) => {
        select.textContent = '';
        if (params.inputPlaceholder) {
          const placeholder = document.createElement('option');
          setInnerHtml(placeholder, params.inputPlaceholder);
          placeholder.value = '';
          placeholder.disabled = true;
          placeholder.selected = true;
          select.appendChild(placeholder);
        }
        setInputLabel(select, select, params);
        return select;
      };

      /**
       * @param {HTMLInputElement} radio
       * @returns {HTMLInputElement}
       */
      renderInputType.radio = radio => {
        radio.textContent = '';
        return radio;
      };

      /**
       * @param {HTMLLabelElement} checkboxContainer
       * @param {SweetAlertOptions} params
       * @returns {HTMLInputElement}
       */
      renderInputType.checkbox = (checkboxContainer, params) => {
        const checkbox = getInput$1(getPopup(), 'checkbox');
        checkbox.value = '1';
        checkbox.id = swalClasses.checkbox;
        checkbox.checked = Boolean(params.inputValue);
        const label = checkboxContainer.querySelector('span');
        setInnerHtml(label, params.inputPlaceholder);
        return checkbox;
      };

      /**
       * @param {HTMLTextAreaElement} textarea
       * @param {SweetAlertOptions} params
       * @returns {HTMLTextAreaElement}
       */
      renderInputType.textarea = (textarea, params) => {
        checkAndSetInputValue(textarea, params.inputValue);
        setInputPlaceholder(textarea, params);
        setInputLabel(textarea, textarea, params);

        /**
         * @param {HTMLElement} el
         * @returns {number}
         */
        const getMargin = el => parseInt(window.getComputedStyle(el).marginLeft) + parseInt(window.getComputedStyle(el).marginRight);

        // https://github.com/sweetalert2/sweetalert2/issues/2291
        setTimeout(() => {
          // https://github.com/sweetalert2/sweetalert2/issues/1699
          if ('MutationObserver' in window) {
            const initialPopupWidth = parseInt(window.getComputedStyle(getPopup()).width);
            const textareaResizeHandler = () => {
              const textareaWidth = textarea.offsetWidth + getMargin(textarea);
              if (textareaWidth > initialPopupWidth) {
                getPopup().style.width = `${textareaWidth}px`;
              } else {
                getPopup().style.width = null;
              }
            };
            new MutationObserver(textareaResizeHandler).observe(textarea, {
              attributes: true,
              attributeFilter: ['style']
            });
          }
        });
        return textarea;
      };

      /**
       * @param {SweetAlert2} instance
       * @param {SweetAlertOptions} params
       */
      const renderContent = (instance, params) => {
        const htmlContainer = getHtmlContainer();
        applyCustomClass(htmlContainer, params, 'htmlContainer');

        // Content as HTML
        if (params.html) {
          parseHtmlToContainer(params.html, htmlContainer);
          show(htmlContainer, 'block');
        }

        // Content as plain text
        else if (params.text) {
          htmlContainer.textContent = params.text;
          show(htmlContainer, 'block');
        }

        // No content
        else {
          hide(htmlContainer);
        }
        renderInput(instance, params);
      };

      /**
       * @param {SweetAlert2} instance
       * @param {SweetAlertOptions} params
       */
      const renderFooter = (instance, params) => {
        const footer = getFooter();
        toggle(footer, params.footer);
        if (params.footer) {
          parseHtmlToContainer(params.footer, footer);
        }

        // Custom class
        applyCustomClass(footer, params, 'footer');
      };

      /**
       * @param {SweetAlert2} instance
       * @param {SweetAlertOptions} params
       */
      const renderIcon = (instance, params) => {
        const innerParams = privateProps.innerParams.get(instance);
        const icon = getIcon();

        // if the given icon already rendered, apply the styling without re-rendering the icon
        if (innerParams && params.icon === innerParams.icon) {
          // Custom or default content
          setContent(icon, params);
          applyStyles(icon, params);
          return;
        }
        if (!params.icon && !params.iconHtml) {
          hide(icon);
          return;
        }
        if (params.icon && Object.keys(iconTypes).indexOf(params.icon) === -1) {
          error(`Unknown icon! Expected "success", "error", "warning", "info" or "question", got "${params.icon}"`);
          hide(icon);
          return;
        }
        show(icon);

        // Custom or default content
        setContent(icon, params);
        applyStyles(icon, params);

        // Animate icon
        addClass(icon, params.showClass.icon);
      };

      /**
       * @param {HTMLElement} icon
       * @param {SweetAlertOptions} params
       */
      const applyStyles = (icon, params) => {
        for (const iconType in iconTypes) {
          if (params.icon !== iconType) {
            removeClass(icon, iconTypes[iconType]);
          }
        }
        addClass(icon, iconTypes[params.icon]);

        // Icon color
        setColor(icon, params);

        // Success icon background color
        adjustSuccessIconBackgroundColor();

        // Custom class
        applyCustomClass(icon, params, 'icon');
      };

      // Adjust success icon background color to match the popup background color
      const adjustSuccessIconBackgroundColor = () => {
        const popup = getPopup();
        const popupBackgroundColor = window.getComputedStyle(popup).getPropertyValue('background-color');
        /** @type {NodeListOf<HTMLElement>} */
        const successIconParts = popup.querySelectorAll('[class^=swal2-success-circular-line], .swal2-success-fix');
        for (let i = 0; i < successIconParts.length; i++) {
          successIconParts[i].style.backgroundColor = popupBackgroundColor;
        }
      };
      const successIconHtml = `
  <div class="swal2-success-circular-line-left"></div>
  <span class="swal2-success-line-tip"></span> <span class="swal2-success-line-long"></span>
  <div class="swal2-success-ring"></div> <div class="swal2-success-fix"></div>
  <div class="swal2-success-circular-line-right"></div>
`;
      const errorIconHtml = `
  <span class="swal2-x-mark">
    <span class="swal2-x-mark-line-left"></span>
    <span class="swal2-x-mark-line-right"></span>
  </span>
`;

      /**
       * @param {HTMLElement} icon
       * @param {SweetAlertOptions} params
       */
      const setContent = (icon, params) => {
        let oldContent = icon.innerHTML;
        let newContent;
        if (params.iconHtml) {
          newContent = iconContent(params.iconHtml);
        } else if (params.icon === 'success') {
          newContent = successIconHtml;
          oldContent = oldContent.replace(/ style=".*?"/g, ''); // undo adjustSuccessIconBackgroundColor()
        } else if (params.icon === 'error') {
          newContent = errorIconHtml;
        } else {
          const defaultIconHtml = {
            question: '?',
            warning: '!',
            info: 'i'
          };
          newContent = iconContent(defaultIconHtml[params.icon]);
        }
        if (oldContent.trim() !== newContent.trim()) {
          setInnerHtml(icon, newContent);
        }
      };

      /**
       * @param {HTMLElement} icon
       * @param {SweetAlertOptions} params
       */
      const setColor = (icon, params) => {
        if (!params.iconColor) {
          return;
        }
        icon.style.color = params.iconColor;
        icon.style.borderColor = params.iconColor;
        for (const sel of ['.swal2-success-line-tip', '.swal2-success-line-long', '.swal2-x-mark-line-left', '.swal2-x-mark-line-right']) {
          setStyle(icon, sel, 'backgroundColor', params.iconColor);
        }
        setStyle(icon, '.swal2-success-ring', 'borderColor', params.iconColor);
      };

      /**
       * @param {string} content
       * @returns {string}
       */
      const iconContent = content => `<div class="${swalClasses['icon-content']}">${content}</div>`;

      /**
       * @param {SweetAlert2} instance
       * @param {SweetAlertOptions} params
       */
      const renderImage = (instance, params) => {
        const image = getImage();
        if (!params.imageUrl) {
          hide(image);
          return;
        }
        show(image, '');

        // Src, alt
        image.setAttribute('src', params.imageUrl);
        image.setAttribute('alt', params.imageAlt);

        // Width, height
        applyNumericalStyle(image, 'width', params.imageWidth);
        applyNumericalStyle(image, 'height', params.imageHeight);

        // Class
        image.className = swalClasses.image;
        applyCustomClass(image, params, 'image');
      };

      /**
       * @param {SweetAlert2} instance
       * @param {SweetAlertOptions} params
       */
      const renderPopup = (instance, params) => {
        const container = getContainer();
        const popup = getPopup();

        // Width
        // https://github.com/sweetalert2/sweetalert2/issues/2170
        if (params.toast) {
          applyNumericalStyle(container, 'width', params.width);
          popup.style.width = '100%';
          popup.insertBefore(getLoader(), getIcon());
        } else {
          applyNumericalStyle(popup, 'width', params.width);
        }

        // Padding
        applyNumericalStyle(popup, 'padding', params.padding);

        // Color
        if (params.color) {
          popup.style.color = params.color;
        }

        // Background
        if (params.background) {
          popup.style.background = params.background;
        }
        hide(getValidationMessage());

        // Classes
        addClasses$1(popup, params);
      };

      /**
       * @param {HTMLElement} popup
       * @param {SweetAlertOptions} params
       */
      const addClasses$1 = (popup, params) => {
        // Default Class + showClass when updating Swal.update({})
        popup.className = `${swalClasses.popup} ${isVisible$1(popup) ? params.showClass.popup : ''}`;
        if (params.toast) {
          addClass([document.documentElement, document.body], swalClasses['toast-shown']);
          addClass(popup, swalClasses.toast);
        } else {
          addClass(popup, swalClasses.modal);
        }

        // Custom class
        applyCustomClass(popup, params, 'popup');
        if (typeof params.customClass === 'string') {
          addClass(popup, params.customClass);
        }

        // Icon class (#1842)
        if (params.icon) {
          addClass(popup, swalClasses[`icon-${params.icon}`]);
        }
      };

      /**
       * @param {SweetAlert2} instance
       * @param {SweetAlertOptions} params
       */
      const renderProgressSteps = (instance, params) => {
        const progressStepsContainer = getProgressSteps();
        if (!params.progressSteps || params.progressSteps.length === 0) {
          hide(progressStepsContainer);
          return;
        }
        show(progressStepsContainer);
        progressStepsContainer.textContent = '';
        if (params.currentProgressStep >= params.progressSteps.length) {
          warn('Invalid currentProgressStep parameter, it should be less than progressSteps.length ' + '(currentProgressStep like JS arrays starts from 0)');
        }
        params.progressSteps.forEach((step, index) => {
          const stepEl = createStepElement(step);
          progressStepsContainer.appendChild(stepEl);
          if (index === params.currentProgressStep) {
            addClass(stepEl, swalClasses['active-progress-step']);
          }
          if (index !== params.progressSteps.length - 1) {
            const lineEl = createLineElement(params);
            progressStepsContainer.appendChild(lineEl);
          }
        });
      };

      /**
       * @param {string} step
       * @returns {HTMLLIElement}
       */
      const createStepElement = step => {
        const stepEl = document.createElement('li');
        addClass(stepEl, swalClasses['progress-step']);
        setInnerHtml(stepEl, step);
        return stepEl;
      };

      /**
       * @param {SweetAlertOptions} params
       * @returns {HTMLLIElement}
       */
      const createLineElement = params => {
        const lineEl = document.createElement('li');
        addClass(lineEl, swalClasses['progress-step-line']);
        if (params.progressStepsDistance) {
          applyNumericalStyle(lineEl, 'width', params.progressStepsDistance);
        }
        return lineEl;
      };

      /**
       * @param {SweetAlert2} instance
       * @param {SweetAlertOptions} params
       */
      const renderTitle = (instance, params) => {
        const title = getTitle();
        toggle(title, params.title || params.titleText, 'block');
        if (params.title) {
          parseHtmlToContainer(params.title, title);
        }
        if (params.titleText) {
          title.innerText = params.titleText;
        }

        // Custom class
        applyCustomClass(title, params, 'title');
      };

      /**
       * @param {SweetAlert2} instance
       * @param {SweetAlertOptions} params
       */
      const render = (instance, params) => {
        renderPopup(instance, params);
        renderContainer(instance, params);
        renderProgressSteps(instance, params);
        renderIcon(instance, params);
        renderImage(instance, params);
        renderTitle(instance, params);
        renderCloseButton(instance, params);
        renderContent(instance, params);
        renderActions(instance, params);
        renderFooter(instance, params);
        if (typeof params.didRender === 'function') {
          params.didRender(getPopup());
        }
      };

      /**
       * Hides loader and shows back the button which was hidden by .showLoading()
       */
      function hideLoading() {
        // do nothing if popup is closed
        const innerParams = privateProps.innerParams.get(this);
        if (!innerParams) {
          return;
        }
        const domCache = privateProps.domCache.get(this);
        hide(domCache.loader);
        if (isToast()) {
          if (innerParams.icon) {
            show(getIcon());
          }
        } else {
          showRelatedButton(domCache);
        }
        removeClass([domCache.popup, domCache.actions], swalClasses.loading);
        domCache.popup.removeAttribute('aria-busy');
        domCache.popup.removeAttribute('data-loading');
        domCache.confirmButton.disabled = false;
        domCache.denyButton.disabled = false;
        domCache.cancelButton.disabled = false;
      }
      const showRelatedButton = domCache => {
        const buttonToReplace = domCache.popup.getElementsByClassName(domCache.loader.getAttribute('data-button-to-replace'));
        if (buttonToReplace.length) {
          show(buttonToReplace[0], 'inline-block');
        } else if (allButtonsAreHidden()) {
          hide(domCache.actions);
        }
      };

      /**
       * Gets the input DOM node, this method works with input parameter.
       *
       * @param {SweetAlert2} instance
       * @returns {HTMLElement | null}
       */
      function getInput(instance) {
        const innerParams = privateProps.innerParams.get(instance || this);
        const domCache = privateProps.domCache.get(instance || this);
        if (!domCache) {
          return null;
        }
        return getInput$1(domCache.popup, innerParams.input);
      }

      /*
       * Global function to determine if SweetAlert2 popup is shown
       */
      const isVisible = () => {
        return isVisible$1(getPopup());
      };

      /*
       * Global function to click 'Confirm' button
       */
      const clickConfirm = () => getConfirmButton() && getConfirmButton().click();

      /*
       * Global function to click 'Deny' button
       */
      const clickDeny = () => getDenyButton() && getDenyButton().click();

      /*
       * Global function to click 'Cancel' button
       */
      const clickCancel = () => getCancelButton() && getCancelButton().click();

      const DismissReason = Object.freeze({
        cancel: 'cancel',
        backdrop: 'backdrop',
        close: 'close',
        esc: 'esc',
        timer: 'timer'
      });

      /**
       * @param {GlobalState} globalState
       */
      const removeKeydownHandler = globalState => {
        if (globalState.keydownTarget && globalState.keydownHandlerAdded) {
          globalState.keydownTarget.removeEventListener('keydown', globalState.keydownHandler, {
            capture: globalState.keydownListenerCapture
          });
          globalState.keydownHandlerAdded = false;
        }
      };

      /**
       * @param {SweetAlert2} instance
       * @param {GlobalState} globalState
       * @param {SweetAlertOptions} innerParams
       * @param {*} dismissWith
       */
      const addKeydownHandler = (instance, globalState, innerParams, dismissWith) => {
        removeKeydownHandler(globalState);
        if (!innerParams.toast) {
          globalState.keydownHandler = e => keydownHandler(instance, e, dismissWith);
          globalState.keydownTarget = innerParams.keydownListenerCapture ? window : getPopup();
          globalState.keydownListenerCapture = innerParams.keydownListenerCapture;
          globalState.keydownTarget.addEventListener('keydown', globalState.keydownHandler, {
            capture: globalState.keydownListenerCapture
          });
          globalState.keydownHandlerAdded = true;
        }
      };

      /**
       * @param {number} index
       * @param {number} increment
       */
      const setFocus = (index, increment) => {
        const focusableElements = getFocusableElements();
        // search for visible elements and select the next possible match
        if (focusableElements.length) {
          index = index + increment;

          // rollover to first item
          if (index === focusableElements.length) {
            index = 0;

            // go to last item
          } else if (index === -1) {
            index = focusableElements.length - 1;
          }
          focusableElements[index].focus();
          return;
        }
        // no visible focusable elements, focus the popup
        getPopup().focus();
      };
      const arrowKeysNextButton = ['ArrowRight', 'ArrowDown'];
      const arrowKeysPreviousButton = ['ArrowLeft', 'ArrowUp'];

      /**
       * @param {SweetAlert2} instance
       * @param {KeyboardEvent} event
       * @param {Function} dismissWith
       */
      const keydownHandler = (instance, event, dismissWith) => {
        const innerParams = privateProps.innerParams.get(instance);
        if (!innerParams) {
          return; // This instance has already been destroyed
        }

        // Ignore keydown during IME composition
        // https://developer.mozilla.org/en-US/docs/Web/API/Document/keydown_event#ignoring_keydown_during_ime_composition
        // https://github.com/sweetalert2/sweetalert2/issues/720
        // https://github.com/sweetalert2/sweetalert2/issues/2406
        if (event.isComposing || event.keyCode === 229) {
          return;
        }
        if (innerParams.stopKeydownPropagation) {
          event.stopPropagation();
        }

        // ENTER
        if (event.key === 'Enter') {
          handleEnter(instance, event, innerParams);
        }

        // TAB
        else if (event.key === 'Tab') {
          handleTab(event);
        }

        // ARROWS - switch focus between buttons
        else if ([...arrowKeysNextButton, ...arrowKeysPreviousButton].includes(event.key)) {
          handleArrows(event.key);
        }

        // ESC
        else if (event.key === 'Escape') {
          handleEsc(event, innerParams, dismissWith);
        }
      };

      /**
       * @param {SweetAlert2} instance
       * @param {KeyboardEvent} event
       * @param {SweetAlertOptions} innerParams
       */
      const handleEnter = (instance, event, innerParams) => {
        // https://github.com/sweetalert2/sweetalert2/issues/2386
        if (!callIfFunction(innerParams.allowEnterKey)) {
          return;
        }
        if (event.target && instance.getInput() && event.target instanceof HTMLElement && event.target.outerHTML === instance.getInput().outerHTML) {
          if (['textarea', 'file'].includes(innerParams.input)) {
            return; // do not submit
          }

          clickConfirm();
          event.preventDefault();
        }
      };

      /**
       * @param {KeyboardEvent} event
       */
      const handleTab = event => {
        const targetElement = event.target;
        const focusableElements = getFocusableElements();
        let btnIndex = -1;
        for (let i = 0; i < focusableElements.length; i++) {
          if (targetElement === focusableElements[i]) {
            btnIndex = i;
            break;
          }
        }

        // Cycle to the next button
        if (!event.shiftKey) {
          setFocus(btnIndex, 1);
        }

        // Cycle to the prev button
        else {
          setFocus(btnIndex, -1);
        }
        event.stopPropagation();
        event.preventDefault();
      };

      /**
       * @param {string} key
       */
      const handleArrows = key => {
        const confirmButton = getConfirmButton();
        const denyButton = getDenyButton();
        const cancelButton = getCancelButton();
        /** @type HTMLElement[] */
        const buttons = [confirmButton, denyButton, cancelButton];
        if (document.activeElement instanceof HTMLElement && !buttons.includes(document.activeElement)) {
          return;
        }
        const sibling = arrowKeysNextButton.includes(key) ? 'nextElementSibling' : 'previousElementSibling';
        let buttonToFocus = document.activeElement;
        for (let i = 0; i < getActions().children.length; i++) {
          buttonToFocus = buttonToFocus[sibling];
          if (!buttonToFocus) {
            return;
          }
          if (buttonToFocus instanceof HTMLButtonElement && isVisible$1(buttonToFocus)) {
            break;
          }
        }
        if (buttonToFocus instanceof HTMLButtonElement) {
          buttonToFocus.focus();
        }
      };

      /**
       * @param {KeyboardEvent} event
       * @param {SweetAlertOptions} innerParams
       * @param {Function} dismissWith
       */
      const handleEsc = (event, innerParams, dismissWith) => {
        if (callIfFunction(innerParams.allowEscapeKey)) {
          event.preventDefault();
          dismissWith(DismissReason.esc);
        }
      };

      /**
       * This module contains `WeakMap`s for each effectively-"private  property" that a `Swal` has.
       * For example, to set the private property "foo" of `this` to "bar", you can `privateProps.foo.set(this, 'bar')`
       * This is the approach that Babel will probably take to implement private methods/fields
       *   https://github.com/tc39/proposal-private-methods
       *   https://github.com/babel/babel/pull/7555
       * Once we have the changes from that PR in Babel, and our core class fits reasonable in *one module*
       *   then we can use that language feature.
       */

      var privateMethods = {
        swalPromiseResolve: new WeakMap(),
        swalPromiseReject: new WeakMap()
      };

      // From https://developer.paciellogroup.com/blog/2018/06/the-current-state-of-modal-dialog-accessibility/
      // Adding aria-hidden="true" to elements outside of the active modal dialog ensures that
      // elements not within the active modal dialog will not be surfaced if a user opens a screen
      // reader’s list of elements (headings, form controls, landmarks, etc.) in the document.

      const setAriaHidden = () => {
        const bodyChildren = Array.from(document.body.children);
        bodyChildren.forEach(el => {
          if (el === getContainer() || el.contains(getContainer())) {
            return;
          }
          if (el.hasAttribute('aria-hidden')) {
            el.setAttribute('data-previous-aria-hidden', el.getAttribute('aria-hidden'));
          }
          el.setAttribute('aria-hidden', 'true');
        });
      };
      const unsetAriaHidden = () => {
        const bodyChildren = Array.from(document.body.children);
        bodyChildren.forEach(el => {
          if (el.hasAttribute('data-previous-aria-hidden')) {
            el.setAttribute('aria-hidden', el.getAttribute('data-previous-aria-hidden'));
            el.removeAttribute('data-previous-aria-hidden');
          } else {
            el.removeAttribute('aria-hidden');
          }
        });
      };

      /* istanbul ignore file */

      // Fix iOS scrolling http://stackoverflow.com/q/39626302

      const iOSfix = () => {
        const iOS =
        // @ts-ignore
        /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
        if (iOS && !hasClass(document.body, swalClasses.iosfix)) {
          const offset = document.body.scrollTop;
          document.body.style.top = `${offset * -1}px`;
          addClass(document.body, swalClasses.iosfix);
          lockBodyScroll();
          addBottomPaddingForTallPopups();
        }
      };

      /**
       * https://github.com/sweetalert2/sweetalert2/issues/1948
       */
      const addBottomPaddingForTallPopups = () => {
        const ua = navigator.userAgent;
        const iOS = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i);
        const webkit = !!ua.match(/WebKit/i);
        const iOSSafari = iOS && webkit && !ua.match(/CriOS/i);
        if (iOSSafari) {
          const bottomPanelHeight = 44;
          if (getPopup().scrollHeight > window.innerHeight - bottomPanelHeight) {
            getContainer().style.paddingBottom = `${bottomPanelHeight}px`;
          }
        }
      };

      /**
       * https://github.com/sweetalert2/sweetalert2/issues/1246
       */
      const lockBodyScroll = () => {
        const container = getContainer();
        let preventTouchMove;
        /**
         * @param {TouchEvent} event
         */
        container.ontouchstart = event => {
          preventTouchMove = shouldPreventTouchMove(event);
        };
        /**
         * @param {TouchEvent} event
         */
        container.ontouchmove = event => {
          if (preventTouchMove) {
            event.preventDefault();
            event.stopPropagation();
          }
        };
      };

      /**
       * @param {TouchEvent} event
       * @returns {boolean}
       */
      const shouldPreventTouchMove = event => {
        const target = event.target;
        const container = getContainer();
        if (isStylus(event) || isZoom(event)) {
          return false;
        }
        if (target === container) {
          return true;
        }
        if (!isScrollable(container) && target instanceof HTMLElement && target.tagName !== 'INPUT' &&
        // #1603
        target.tagName !== 'TEXTAREA' &&
        // #2266
        !(isScrollable(getHtmlContainer()) &&
        // #1944
        getHtmlContainer().contains(target))) {
          return true;
        }
        return false;
      };

      /**
       * https://github.com/sweetalert2/sweetalert2/issues/1786
       *
       * @param {*} event
       * @returns {boolean}
       */
      const isStylus = event => {
        return event.touches && event.touches.length && event.touches[0].touchType === 'stylus';
      };

      /**
       * https://github.com/sweetalert2/sweetalert2/issues/1891
       *
       * @param {TouchEvent} event
       * @returns {boolean}
       */
      const isZoom = event => {
        return event.touches && event.touches.length > 1;
      };
      const undoIOSfix = () => {
        if (hasClass(document.body, swalClasses.iosfix)) {
          const offset = parseInt(document.body.style.top, 10);
          removeClass(document.body, swalClasses.iosfix);
          document.body.style.top = '';
          document.body.scrollTop = offset * -1;
        }
      };

      const fixScrollbar = () => {
        // for queues, do not do this more than once
        if (states.previousBodyPadding !== null) {
          return;
        }
        // if the body has overflow
        if (document.body.scrollHeight > window.innerHeight) {
          // add padding so the content doesn't shift after removal of scrollbar
          states.previousBodyPadding = parseInt(window.getComputedStyle(document.body).getPropertyValue('padding-right'));
          document.body.style.paddingRight = `${states.previousBodyPadding + measureScrollbar()}px`;
        }
      };
      const undoScrollbar = () => {
        if (states.previousBodyPadding !== null) {
          document.body.style.paddingRight = `${states.previousBodyPadding}px`;
          states.previousBodyPadding = null;
        }
      };

      /**
       * @param {SweetAlert2} instance
       * @param {HTMLElement} container
       * @param {boolean} returnFocus
       * @param {Function} didClose
       */
      function removePopupAndResetState(instance, container, returnFocus, didClose) {
        if (isToast()) {
          triggerDidCloseAndDispose(instance, didClose);
        } else {
          restoreActiveElement(returnFocus).then(() => triggerDidCloseAndDispose(instance, didClose));
          removeKeydownHandler(globalState);
        }
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        // workaround for #2088
        // for some reason removing the container in Safari will scroll the document to bottom
        if (isSafari) {
          container.setAttribute('style', 'display:none !important');
          container.removeAttribute('class');
          container.innerHTML = '';
        } else {
          container.remove();
        }
        if (isModal()) {
          undoScrollbar();
          undoIOSfix();
          unsetAriaHidden();
        }
        removeBodyClasses();
      }

      /**
       * Remove SweetAlert2 classes from body
       */
      function removeBodyClasses() {
        removeClass([document.documentElement, document.body], [swalClasses.shown, swalClasses['height-auto'], swalClasses['no-backdrop'], swalClasses['toast-shown']]);
      }

      /**
       * Instance method to close sweetAlert
       *
       * @param {any} resolveValue
       */
      function close(resolveValue) {
        resolveValue = prepareResolveValue(resolveValue);
        const swalPromiseResolve = privateMethods.swalPromiseResolve.get(this);
        const didClose = triggerClosePopup(this);
        if (this.isAwaitingPromise()) {
          // A swal awaiting for a promise (after a click on Confirm or Deny) cannot be dismissed anymore #2335
          if (!resolveValue.isDismissed) {
            handleAwaitingPromise(this);
            swalPromiseResolve(resolveValue);
          }
        } else if (didClose) {
          // Resolve Swal promise
          swalPromiseResolve(resolveValue);
        }
      }

      /**
       * @returns {boolean}
       */
      function isAwaitingPromise() {
        return !!privateProps.awaitingPromise.get(this);
      }
      const triggerClosePopup = instance => {
        const popup = getPopup();
        if (!popup) {
          return false;
        }
        const innerParams = privateProps.innerParams.get(instance);
        if (!innerParams || hasClass(popup, innerParams.hideClass.popup)) {
          return false;
        }
        removeClass(popup, innerParams.showClass.popup);
        addClass(popup, innerParams.hideClass.popup);
        const backdrop = getContainer();
        removeClass(backdrop, innerParams.showClass.backdrop);
        addClass(backdrop, innerParams.hideClass.backdrop);
        handlePopupAnimation(instance, popup, innerParams);
        return true;
      };

      /**
       * @param {any} error
       */
      function rejectPromise(error) {
        const rejectPromise = privateMethods.swalPromiseReject.get(this);
        handleAwaitingPromise(this);
        if (rejectPromise) {
          // Reject Swal promise
          rejectPromise(error);
        }
      }

      /**
       * @param {SweetAlert2} instance
       */
      const handleAwaitingPromise = instance => {
        // @ts-ignore
        if (instance.isAwaitingPromise()) {
          privateProps.awaitingPromise.delete(instance);
          // The instance might have been previously partly destroyed, we must resume the destroy process in this case #2335
          if (!privateProps.innerParams.get(instance)) {
            // @ts-ignore
            instance._destroy();
          }
        }
      };

      /**
       * @param {any} resolveValue
       * @returns {import('sweetalert2').SweetAlertResult}
       */
      const prepareResolveValue = resolveValue => {
        // When user calls Swal.close()
        if (typeof resolveValue === 'undefined') {
          return {
            isConfirmed: false,
            isDenied: false,
            isDismissed: true
          };
        }
        return Object.assign({
          isConfirmed: false,
          isDenied: false,
          isDismissed: false
        }, resolveValue);
      };

      /**
       * @param {SweetAlert2} instance
       * @param {HTMLElement} popup
       * @param {SweetAlertOptions} innerParams
       */
      const handlePopupAnimation = (instance, popup, innerParams) => {
        const container = getContainer();
        // If animation is supported, animate
        const animationIsSupported = animationEndEvent && hasCssAnimation(popup);
        if (typeof innerParams.willClose === 'function') {
          innerParams.willClose(popup);
        }
        if (animationIsSupported) {
          animatePopup(instance, popup, container, innerParams.returnFocus, innerParams.didClose);
        } else {
          // Otherwise, remove immediately
          removePopupAndResetState(instance, container, innerParams.returnFocus, innerParams.didClose);
        }
      };

      /**
       * @param {SweetAlert2} instance
       * @param {HTMLElement} popup
       * @param {HTMLElement} container
       * @param {boolean} returnFocus
       * @param {Function} didClose
       */
      const animatePopup = (instance, popup, container, returnFocus, didClose) => {
        globalState.swalCloseEventFinishedCallback = removePopupAndResetState.bind(null, instance, container, returnFocus, didClose);
        popup.addEventListener(animationEndEvent, function (e) {
          if (e.target === popup) {
            globalState.swalCloseEventFinishedCallback();
            delete globalState.swalCloseEventFinishedCallback;
          }
        });
      };

      /**
       * @param {SweetAlert2} instance
       * @param {Function} didClose
       */
      const triggerDidCloseAndDispose = (instance, didClose) => {
        setTimeout(() => {
          if (typeof didClose === 'function') {
            // @ts-ignore
            didClose.bind(instance.params)();
          }
          // @ts-ignore
          instance._destroy();
        });
      };

      /**
       * @param {SweetAlert2} instance
       * @param {string[]} buttons
       * @param {boolean} disabled
       */
      function setButtonsDisabled(instance, buttons, disabled) {
        const domCache = privateProps.domCache.get(instance);
        buttons.forEach(button => {
          domCache[button].disabled = disabled;
        });
      }

      /**
       * @param {HTMLInputElement} input
       * @param {boolean} disabled
       */
      function setInputDisabled(input, disabled) {
        if (!input) {
          return;
        }
        if (input.type === 'radio') {
          const radiosContainer = input.parentNode.parentNode;
          const radios = radiosContainer.querySelectorAll('input');
          for (let i = 0; i < radios.length; i++) {
            radios[i].disabled = disabled;
          }
        } else {
          input.disabled = disabled;
        }
      }
      function enableButtons() {
        setButtonsDisabled(this, ['confirmButton', 'denyButton', 'cancelButton'], false);
      }
      function disableButtons() {
        setButtonsDisabled(this, ['confirmButton', 'denyButton', 'cancelButton'], true);
      }
      function enableInput() {
        setInputDisabled(this.getInput(), false);
      }
      function disableInput() {
        setInputDisabled(this.getInput(), true);
      }

      /**
       * Show block with validation message
       *
       * @param {string} error
       */
      function showValidationMessage(error) {
        const domCache = privateProps.domCache.get(this);
        const params = privateProps.innerParams.get(this);
        setInnerHtml(domCache.validationMessage, error);
        domCache.validationMessage.className = swalClasses['validation-message'];
        if (params.customClass && params.customClass.validationMessage) {
          addClass(domCache.validationMessage, params.customClass.validationMessage);
        }
        show(domCache.validationMessage);
        const input = this.getInput();
        if (input) {
          input.setAttribute('aria-invalid', true);
          input.setAttribute('aria-describedby', swalClasses['validation-message']);
          focusInput(input);
          addClass(input, swalClasses.inputerror);
        }
      }

      /**
       * Hide block with validation message
       */
      function resetValidationMessage() {
        const domCache = privateProps.domCache.get(this);
        if (domCache.validationMessage) {
          hide(domCache.validationMessage);
        }
        const input = this.getInput();
        if (input) {
          input.removeAttribute('aria-invalid');
          input.removeAttribute('aria-describedby');
          removeClass(input, swalClasses.inputerror);
        }
      }

      const defaultParams = {
        title: '',
        titleText: '',
        text: '',
        html: '',
        footer: '',
        icon: undefined,
        iconColor: undefined,
        iconHtml: undefined,
        template: undefined,
        toast: false,
        showClass: {
          popup: 'swal2-show',
          backdrop: 'swal2-backdrop-show',
          icon: 'swal2-icon-show'
        },
        hideClass: {
          popup: 'swal2-hide',
          backdrop: 'swal2-backdrop-hide',
          icon: 'swal2-icon-hide'
        },
        customClass: {},
        target: 'body',
        color: undefined,
        backdrop: true,
        heightAuto: true,
        allowOutsideClick: true,
        allowEscapeKey: true,
        allowEnterKey: true,
        stopKeydownPropagation: true,
        keydownListenerCapture: false,
        showConfirmButton: true,
        showDenyButton: false,
        showCancelButton: false,
        preConfirm: undefined,
        preDeny: undefined,
        confirmButtonText: 'OK',
        confirmButtonAriaLabel: '',
        confirmButtonColor: undefined,
        denyButtonText: 'No',
        denyButtonAriaLabel: '',
        denyButtonColor: undefined,
        cancelButtonText: 'Cancel',
        cancelButtonAriaLabel: '',
        cancelButtonColor: undefined,
        buttonsStyling: true,
        reverseButtons: false,
        focusConfirm: true,
        focusDeny: false,
        focusCancel: false,
        returnFocus: true,
        showCloseButton: false,
        closeButtonHtml: '&times;',
        closeButtonAriaLabel: 'Close this dialog',
        loaderHtml: '',
        showLoaderOnConfirm: false,
        showLoaderOnDeny: false,
        imageUrl: undefined,
        imageWidth: undefined,
        imageHeight: undefined,
        imageAlt: '',
        timer: undefined,
        timerProgressBar: false,
        width: undefined,
        padding: undefined,
        background: undefined,
        input: undefined,
        inputPlaceholder: '',
        inputLabel: '',
        inputValue: '',
        inputOptions: {},
        inputAutoFocus: true,
        inputAutoTrim: true,
        inputAttributes: {},
        inputValidator: undefined,
        returnInputValueOnDeny: false,
        validationMessage: undefined,
        grow: false,
        position: 'center',
        progressSteps: [],
        currentProgressStep: undefined,
        progressStepsDistance: undefined,
        willOpen: undefined,
        didOpen: undefined,
        didRender: undefined,
        willClose: undefined,
        didClose: undefined,
        didDestroy: undefined,
        scrollbarPadding: true
      };
      const updatableParams = ['allowEscapeKey', 'allowOutsideClick', 'background', 'buttonsStyling', 'cancelButtonAriaLabel', 'cancelButtonColor', 'cancelButtonText', 'closeButtonAriaLabel', 'closeButtonHtml', 'color', 'confirmButtonAriaLabel', 'confirmButtonColor', 'confirmButtonText', 'currentProgressStep', 'customClass', 'denyButtonAriaLabel', 'denyButtonColor', 'denyButtonText', 'didClose', 'didDestroy', 'footer', 'hideClass', 'html', 'icon', 'iconColor', 'iconHtml', 'imageAlt', 'imageHeight', 'imageUrl', 'imageWidth', 'preConfirm', 'preDeny', 'progressSteps', 'returnFocus', 'reverseButtons', 'showCancelButton', 'showCloseButton', 'showConfirmButton', 'showDenyButton', 'text', 'title', 'titleText', 'willClose'];
      const deprecatedParams = {};
      const toastIncompatibleParams = ['allowOutsideClick', 'allowEnterKey', 'backdrop', 'focusConfirm', 'focusDeny', 'focusCancel', 'returnFocus', 'heightAuto', 'keydownListenerCapture'];

      /**
       * Is valid parameter
       *
       * @param {string} paramName
       * @returns {boolean}
       */
      const isValidParameter = paramName => {
        return Object.prototype.hasOwnProperty.call(defaultParams, paramName);
      };

      /**
       * Is valid parameter for Swal.update() method
       *
       * @param {string} paramName
       * @returns {boolean}
       */
      const isUpdatableParameter = paramName => {
        return updatableParams.indexOf(paramName) !== -1;
      };

      /**
       * Is deprecated parameter
       *
       * @param {string} paramName
       * @returns {string | undefined}
       */
      const isDeprecatedParameter = paramName => {
        return deprecatedParams[paramName];
      };

      /**
       * @param {string} param
       */
      const checkIfParamIsValid = param => {
        if (!isValidParameter(param)) {
          warn(`Unknown parameter "${param}"`);
        }
      };

      /**
       * @param {string} param
       */
      const checkIfToastParamIsValid = param => {
        if (toastIncompatibleParams.includes(param)) {
          warn(`The parameter "${param}" is incompatible with toasts`);
        }
      };

      /**
       * @param {string} param
       */
      const checkIfParamIsDeprecated = param => {
        if (isDeprecatedParameter(param)) {
          warnAboutDeprecation(param, isDeprecatedParameter(param));
        }
      };

      /**
       * Show relevant warnings for given params
       *
       * @param {SweetAlertOptions} params
       */
      const showWarningsForParams = params => {
        if (params.backdrop === false && params.allowOutsideClick) {
          warn('"allowOutsideClick" parameter requires `backdrop` parameter to be set to `true`');
        }
        for (const param in params) {
          checkIfParamIsValid(param);
          if (params.toast) {
            checkIfToastParamIsValid(param);
          }
          checkIfParamIsDeprecated(param);
        }
      };

      /**
       * Updates popup parameters.
       *
       * @param {SweetAlertOptions} params
       */
      function update(params) {
        const popup = getPopup();
        const innerParams = privateProps.innerParams.get(this);
        if (!popup || hasClass(popup, innerParams.hideClass.popup)) {
          warn(`You're trying to update the closed or closing popup, that won't work. Use the update() method in preConfirm parameter or show a new popup.`);
          return;
        }
        const validUpdatableParams = filterValidParams(params);
        const updatedParams = Object.assign({}, innerParams, validUpdatableParams);
        render(this, updatedParams);
        privateProps.innerParams.set(this, updatedParams);
        Object.defineProperties(this, {
          params: {
            value: Object.assign({}, this.params, params),
            writable: false,
            enumerable: true
          }
        });
      }

      /**
       * @param {SweetAlertOptions} params
       * @returns {SweetAlertOptions}
       */
      const filterValidParams = params => {
        const validUpdatableParams = {};
        Object.keys(params).forEach(param => {
          if (isUpdatableParameter(param)) {
            validUpdatableParams[param] = params[param];
          } else {
            warn(`Invalid parameter to update: ${param}`);
          }
        });
        return validUpdatableParams;
      };

      /**
       * Dispose the current SweetAlert2 instance
       */
      function _destroy() {
        const domCache = privateProps.domCache.get(this);
        const innerParams = privateProps.innerParams.get(this);
        if (!innerParams) {
          disposeWeakMaps(this); // The WeakMaps might have been partly destroyed, we must recall it to dispose any remaining WeakMaps #2335
          return; // This instance has already been destroyed
        }

        // Check if there is another Swal closing
        if (domCache.popup && globalState.swalCloseEventFinishedCallback) {
          globalState.swalCloseEventFinishedCallback();
          delete globalState.swalCloseEventFinishedCallback;
        }
        if (typeof innerParams.didDestroy === 'function') {
          innerParams.didDestroy();
        }
        disposeSwal(this);
      }

      /**
       * @param {SweetAlert2} instance
       */
      const disposeSwal = instance => {
        disposeWeakMaps(instance);
        // Unset this.params so GC will dispose it (#1569)
        // @ts-ignore
        delete instance.params;
        // Unset globalState props so GC will dispose globalState (#1569)
        delete globalState.keydownHandler;
        delete globalState.keydownTarget;
        // Unset currentInstance
        delete globalState.currentInstance;
      };

      /**
       * @param {SweetAlert2} instance
       */
      const disposeWeakMaps = instance => {
        // If the current instance is awaiting a promise result, we keep the privateMethods to call them once the promise result is retrieved #2335
        // @ts-ignore
        if (instance.isAwaitingPromise()) {
          unsetWeakMaps(privateProps, instance);
          privateProps.awaitingPromise.set(instance, true);
        } else {
          unsetWeakMaps(privateMethods, instance);
          unsetWeakMaps(privateProps, instance);
        }
      };

      /**
       * @param {object} obj
       * @param {SweetAlert2} instance
       */
      const unsetWeakMaps = (obj, instance) => {
        for (const i in obj) {
          obj[i].delete(instance);
        }
      };

      var instanceMethods = /*#__PURE__*/Object.freeze({
        __proto__: null,
        _destroy: _destroy,
        close: close,
        closeModal: close,
        closePopup: close,
        closeToast: close,
        disableButtons: disableButtons,
        disableInput: disableInput,
        disableLoading: hideLoading,
        enableButtons: enableButtons,
        enableInput: enableInput,
        getInput: getInput,
        handleAwaitingPromise: handleAwaitingPromise,
        hideLoading: hideLoading,
        isAwaitingPromise: isAwaitingPromise,
        rejectPromise: rejectPromise,
        resetValidationMessage: resetValidationMessage,
        showValidationMessage: showValidationMessage,
        update: update
      });

      /**
       * Shows loader (spinner), this is useful with AJAX requests.
       * By default the loader be shown instead of the "Confirm" button.
       *
       * @param {HTMLButtonElement} [buttonToReplace]
       */
      const showLoading = buttonToReplace => {
        let popup = getPopup();
        if (!popup) {
          new Swal(); // eslint-disable-line no-new
        }

        popup = getPopup();
        const loader = getLoader();
        if (isToast()) {
          hide(getIcon());
        } else {
          replaceButton(popup, buttonToReplace);
        }
        show(loader);
        popup.setAttribute('data-loading', 'true');
        popup.setAttribute('aria-busy', 'true');
        popup.focus();
      };

      /**
       * @param {HTMLElement} popup
       * @param {HTMLButtonElement} [buttonToReplace]
       */
      const replaceButton = (popup, buttonToReplace) => {
        const actions = getActions();
        const loader = getLoader();
        if (!buttonToReplace && isVisible$1(getConfirmButton())) {
          buttonToReplace = getConfirmButton();
        }
        show(actions);
        if (buttonToReplace) {
          hide(buttonToReplace);
          loader.setAttribute('data-button-to-replace', buttonToReplace.className);
        }
        loader.parentNode.insertBefore(loader, buttonToReplace);
        addClass([popup, actions], swalClasses.loading);
      };

      /**
       * @typedef { string | number | boolean } InputValue
       */

      /**
       * @param {SweetAlert2} instance
       * @param {SweetAlertOptions} params
       */
      const handleInputOptionsAndValue = (instance, params) => {
        if (params.input === 'select' || params.input === 'radio') {
          handleInputOptions(instance, params);
        } else if (['text', 'email', 'number', 'tel', 'textarea'].includes(params.input) && (hasToPromiseFn(params.inputValue) || isPromise(params.inputValue))) {
          showLoading(getConfirmButton());
          handleInputValue(instance, params);
        }
      };

      /**
       * @param {SweetAlert2} instance
       * @param {SweetAlertOptions} innerParams
       * @returns {string | number | File | FileList | null}
       */
      const getInputValue = (instance, innerParams) => {
        const input = instance.getInput();
        if (!input) {
          return null;
        }
        switch (innerParams.input) {
          case 'checkbox':
            return getCheckboxValue(input);
          case 'radio':
            return getRadioValue(input);
          case 'file':
            return getFileValue(input);
          default:
            return innerParams.inputAutoTrim ? input.value.trim() : input.value;
        }
      };

      /**
       * @param {HTMLInputElement} input
       * @returns {number}
       */
      const getCheckboxValue = input => input.checked ? 1 : 0;

      /**
       * @param {HTMLInputElement} input
       * @returns {string | null}
       */
      const getRadioValue = input => input.checked ? input.value : null;

      /**
       * @param {HTMLInputElement} input
       * @returns {FileList | File | null}
       */
      const getFileValue = input => input.files.length ? input.getAttribute('multiple') !== null ? input.files : input.files[0] : null;

      /**
       * @param {SweetAlert2} instance
       * @param {SweetAlertOptions} params
       */
      const handleInputOptions = (instance, params) => {
        const popup = getPopup();
        /**
         * @param {Record<string, any>} inputOptions
         */
        const processInputOptions = inputOptions => {
          populateInputOptions[params.input](popup, formatInputOptions(inputOptions), params);
        };
        if (hasToPromiseFn(params.inputOptions) || isPromise(params.inputOptions)) {
          showLoading(getConfirmButton());
          asPromise(params.inputOptions).then(inputOptions => {
            instance.hideLoading();
            processInputOptions(inputOptions);
          });
        } else if (typeof params.inputOptions === 'object') {
          processInputOptions(params.inputOptions);
        } else {
          error(`Unexpected type of inputOptions! Expected object, Map or Promise, got ${typeof params.inputOptions}`);
        }
      };

      /**
       * @param {SweetAlert2} instance
       * @param {SweetAlertOptions} params
       */
      const handleInputValue = (instance, params) => {
        const input = instance.getInput();
        hide(input);
        asPromise(params.inputValue).then(inputValue => {
          input.value = params.input === 'number' ? `${parseFloat(inputValue) || 0}` : `${inputValue}`;
          show(input);
          input.focus();
          instance.hideLoading();
        }).catch(err => {
          error(`Error in inputValue promise: ${err}`);
          input.value = '';
          show(input);
          input.focus();
          instance.hideLoading();
        });
      };
      const populateInputOptions = {
        /**
         * @param {HTMLElement} popup
         * @param {Record<string, any>} inputOptions
         * @param {SweetAlertOptions} params
         */
        select: (popup, inputOptions, params) => {
          const select = getDirectChildByClass(popup, swalClasses.select);
          /**
           * @param {HTMLElement} parent
           * @param {string} optionLabel
           * @param {string} optionValue
           */
          const renderOption = (parent, optionLabel, optionValue) => {
            const option = document.createElement('option');
            option.value = optionValue;
            setInnerHtml(option, optionLabel);
            option.selected = isSelected(optionValue, params.inputValue);
            parent.appendChild(option);
          };
          inputOptions.forEach(inputOption => {
            const optionValue = inputOption[0];
            const optionLabel = inputOption[1];
            // <optgroup> spec:
            // https://www.w3.org/TR/html401/interact/forms.html#h-17.6
            // "...all OPTGROUP elements must be specified directly within a SELECT element (i.e., groups may not be nested)..."
            // check whether this is a <optgroup>
            if (Array.isArray(optionLabel)) {
              // if it is an array, then it is an <optgroup>
              const optgroup = document.createElement('optgroup');
              optgroup.label = optionValue;
              optgroup.disabled = false; // not configurable for now
              select.appendChild(optgroup);
              optionLabel.forEach(o => renderOption(optgroup, o[1], o[0]));
            } else {
              // case of <option>
              renderOption(select, optionLabel, optionValue);
            }
          });
          select.focus();
        },
        /**
         * @param {HTMLElement} popup
         * @param {Record<string, any>} inputOptions
         * @param {SweetAlertOptions} params
         */
        radio: (popup, inputOptions, params) => {
          const radio = getDirectChildByClass(popup, swalClasses.radio);
          inputOptions.forEach(inputOption => {
            const radioValue = inputOption[0];
            const radioLabel = inputOption[1];
            const radioInput = document.createElement('input');
            const radioLabelElement = document.createElement('label');
            radioInput.type = 'radio';
            radioInput.name = swalClasses.radio;
            radioInput.value = radioValue;
            if (isSelected(radioValue, params.inputValue)) {
              radioInput.checked = true;
            }
            const label = document.createElement('span');
            setInnerHtml(label, radioLabel);
            label.className = swalClasses.label;
            radioLabelElement.appendChild(radioInput);
            radioLabelElement.appendChild(label);
            radio.appendChild(radioLabelElement);
          });
          const radios = radio.querySelectorAll('input');
          if (radios.length) {
            radios[0].focus();
          }
        }
      };

      /**
       * Converts `inputOptions` into an array of `[value, label]`s
       *
       * @param {Record<string, any>} inputOptions
       * @returns {Array<Array<string>>}
       */
      const formatInputOptions = inputOptions => {
        const result = [];
        if (typeof Map !== 'undefined' && inputOptions instanceof Map) {
          inputOptions.forEach((value, key) => {
            let valueFormatted = value;
            if (typeof valueFormatted === 'object') {
              // case of <optgroup>
              valueFormatted = formatInputOptions(valueFormatted);
            }
            result.push([key, valueFormatted]);
          });
        } else {
          Object.keys(inputOptions).forEach(key => {
            let valueFormatted = inputOptions[key];
            if (typeof valueFormatted === 'object') {
              // case of <optgroup>
              valueFormatted = formatInputOptions(valueFormatted);
            }
            result.push([key, valueFormatted]);
          });
        }
        return result;
      };

      /**
       * @param {string} optionValue
       * @param {InputValue | Promise<InputValue> | { toPromise: () => InputValue }} inputValue
       * @returns {boolean}
       */
      const isSelected = (optionValue, inputValue) => {
        return inputValue && inputValue.toString() === optionValue.toString();
      };

      /**
       * @param {SweetAlert2} instance
       */
      const handleConfirmButtonClick = instance => {
        const innerParams = privateProps.innerParams.get(instance);
        instance.disableButtons();
        if (innerParams.input) {
          handleConfirmOrDenyWithInput(instance, 'confirm');
        } else {
          confirm(instance, true);
        }
      };

      /**
       * @param {SweetAlert2} instance
       */
      const handleDenyButtonClick = instance => {
        const innerParams = privateProps.innerParams.get(instance);
        instance.disableButtons();
        if (innerParams.returnInputValueOnDeny) {
          handleConfirmOrDenyWithInput(instance, 'deny');
        } else {
          deny(instance, false);
        }
      };

      /**
       * @param {SweetAlert2} instance
       * @param {Function} dismissWith
       */
      const handleCancelButtonClick = (instance, dismissWith) => {
        instance.disableButtons();
        dismissWith(DismissReason.cancel);
      };

      /**
       * @param {SweetAlert2} instance
       * @param {'confirm' | 'deny'} type
       */
      const handleConfirmOrDenyWithInput = (instance, type) => {
        const innerParams = privateProps.innerParams.get(instance);
        if (!innerParams.input) {
          error(`The "input" parameter is needed to be set when using returnInputValueOn${capitalizeFirstLetter(type)}`);
          return;
        }
        const inputValue = getInputValue(instance, innerParams);
        if (innerParams.inputValidator) {
          handleInputValidator(instance, inputValue, type);
        } else if (!instance.getInput().checkValidity()) {
          instance.enableButtons();
          instance.showValidationMessage(innerParams.validationMessage);
        } else if (type === 'deny') {
          deny(instance, inputValue);
        } else {
          confirm(instance, inputValue);
        }
      };

      /**
       * @param {SweetAlert2} instance
       * @param {string | number | File | FileList | null} inputValue
       * @param {'confirm' | 'deny'} type
       */
      const handleInputValidator = (instance, inputValue, type) => {
        const innerParams = privateProps.innerParams.get(instance);
        instance.disableInput();
        const validationPromise = Promise.resolve().then(() => asPromise(innerParams.inputValidator(inputValue, innerParams.validationMessage)));
        validationPromise.then(validationMessage => {
          instance.enableButtons();
          instance.enableInput();
          if (validationMessage) {
            instance.showValidationMessage(validationMessage);
          } else if (type === 'deny') {
            deny(instance, inputValue);
          } else {
            confirm(instance, inputValue);
          }
        });
      };

      /**
       * @param {SweetAlert2} instance
       * @param {any} value
       */
      const deny = (instance, value) => {
        const innerParams = privateProps.innerParams.get(instance || undefined);
        if (innerParams.showLoaderOnDeny) {
          showLoading(getDenyButton());
        }
        if (innerParams.preDeny) {
          privateProps.awaitingPromise.set(instance || undefined, true); // Flagging the instance as awaiting a promise so it's own promise's reject/resolve methods doesn't get destroyed until the result from this preDeny's promise is received
          const preDenyPromise = Promise.resolve().then(() => asPromise(innerParams.preDeny(value, innerParams.validationMessage)));
          preDenyPromise.then(preDenyValue => {
            if (preDenyValue === false) {
              instance.hideLoading();
              handleAwaitingPromise(instance);
            } else {
              instance.close({
                isDenied: true,
                value: typeof preDenyValue === 'undefined' ? value : preDenyValue
              });
            }
          }).catch(error => rejectWith(instance || undefined, error));
        } else {
          instance.close({
            isDenied: true,
            value
          });
        }
      };

      /**
       * @param {SweetAlert2} instance
       * @param {any} value
       */
      const succeedWith = (instance, value) => {
        instance.close({
          isConfirmed: true,
          value
        });
      };

      /**
       *
       * @param {SweetAlert2} instance
       * @param {string} error
       */
      const rejectWith = (instance, error) => {
        // @ts-ignore
        instance.rejectPromise(error);
      };

      /**
       *
       * @param {SweetAlert2} instance
       * @param {any} value
       */
      const confirm = (instance, value) => {
        const innerParams = privateProps.innerParams.get(instance || undefined);
        if (innerParams.showLoaderOnConfirm) {
          showLoading();
        }
        if (innerParams.preConfirm) {
          instance.resetValidationMessage();
          privateProps.awaitingPromise.set(instance || undefined, true); // Flagging the instance as awaiting a promise so it's own promise's reject/resolve methods doesn't get destroyed until the result from this preConfirm's promise is received
          const preConfirmPromise = Promise.resolve().then(() => asPromise(innerParams.preConfirm(value, innerParams.validationMessage)));
          preConfirmPromise.then(preConfirmValue => {
            if (isVisible$1(getValidationMessage()) || preConfirmValue === false) {
              instance.hideLoading();
              handleAwaitingPromise(instance);
            } else {
              succeedWith(instance, typeof preConfirmValue === 'undefined' ? value : preConfirmValue);
            }
          }).catch(error => rejectWith(instance || undefined, error));
        } else {
          succeedWith(instance, value);
        }
      };

      const handlePopupClick = (instance, domCache, dismissWith) => {
        const innerParams = privateProps.innerParams.get(instance);
        if (innerParams.toast) {
          handleToastClick(instance, domCache, dismissWith);
        } else {
          // Ignore click events that had mousedown on the popup but mouseup on the container
          // This can happen when the user drags a slider
          handleModalMousedown(domCache);

          // Ignore click events that had mousedown on the container but mouseup on the popup
          handleContainerMousedown(domCache);
          handleModalClick(instance, domCache, dismissWith);
        }
      };
      const handleToastClick = (instance, domCache, dismissWith) => {
        // Closing toast by internal click
        domCache.popup.onclick = () => {
          const innerParams = privateProps.innerParams.get(instance);
          if (innerParams && (isAnyButtonShown(innerParams) || innerParams.timer || innerParams.input)) {
            return;
          }
          dismissWith(DismissReason.close);
        };
      };

      /**
       * @param {*} innerParams
       * @returns {boolean}
       */
      const isAnyButtonShown = innerParams => {
        return innerParams.showConfirmButton || innerParams.showDenyButton || innerParams.showCancelButton || innerParams.showCloseButton;
      };
      let ignoreOutsideClick = false;
      const handleModalMousedown = domCache => {
        domCache.popup.onmousedown = () => {
          domCache.container.onmouseup = function (e) {
            domCache.container.onmouseup = undefined;
            // We only check if the mouseup target is the container because usually it doesn't
            // have any other direct children aside of the popup
            if (e.target === domCache.container) {
              ignoreOutsideClick = true;
            }
          };
        };
      };
      const handleContainerMousedown = domCache => {
        domCache.container.onmousedown = () => {
          domCache.popup.onmouseup = function (e) {
            domCache.popup.onmouseup = undefined;
            // We also need to check if the mouseup target is a child of the popup
            if (e.target === domCache.popup || domCache.popup.contains(e.target)) {
              ignoreOutsideClick = true;
            }
          };
        };
      };
      const handleModalClick = (instance, domCache, dismissWith) => {
        domCache.container.onclick = e => {
          const innerParams = privateProps.innerParams.get(instance);
          if (ignoreOutsideClick) {
            ignoreOutsideClick = false;
            return;
          }
          if (e.target === domCache.container && callIfFunction(innerParams.allowOutsideClick)) {
            dismissWith(DismissReason.backdrop);
          }
        };
      };

      const isJqueryElement = elem => typeof elem === 'object' && elem.jquery;
      const isElement = elem => elem instanceof Element || isJqueryElement(elem);
      const argsToParams = args => {
        const params = {};
        if (typeof args[0] === 'object' && !isElement(args[0])) {
          Object.assign(params, args[0]);
        } else {
          ['title', 'html', 'icon'].forEach((name, index) => {
            const arg = args[index];
            if (typeof arg === 'string' || isElement(arg)) {
              params[name] = arg;
            } else if (arg !== undefined) {
              error(`Unexpected type of ${name}! Expected "string" or "Element", got ${typeof arg}`);
            }
          });
        }
        return params;
      };

      function fire() {
        const Swal = this; // eslint-disable-line @typescript-eslint/no-this-alias
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }
        return new Swal(...args);
      }

      /**
       * Returns an extended version of `Swal` containing `params` as defaults.
       * Useful for reusing Swal configuration.
       *
       * For example:
       *
       * Before:
       * const textPromptOptions = { input: 'text', showCancelButton: true }
       * const {value: firstName} = await Swal.fire({ ...textPromptOptions, title: 'What is your first name?' })
       * const {value: lastName} = await Swal.fire({ ...textPromptOptions, title: 'What is your last name?' })
       *
       * After:
       * const TextPrompt = Swal.mixin({ input: 'text', showCancelButton: true })
       * const {value: firstName} = await TextPrompt('What is your first name?')
       * const {value: lastName} = await TextPrompt('What is your last name?')
       *
       * @param mixinParams
       */
      function mixin(mixinParams) {
        class MixinSwal extends this {
          _main(params, priorityMixinParams) {
            return super._main(params, Object.assign({}, mixinParams, priorityMixinParams));
          }
        }
        return MixinSwal;
      }

      /**
       * If `timer` parameter is set, returns number of milliseconds of timer remained.
       * Otherwise, returns undefined.
       *
       * @returns {number | undefined}
       */
      const getTimerLeft = () => {
        return globalState.timeout && globalState.timeout.getTimerLeft();
      };

      /**
       * Stop timer. Returns number of milliseconds of timer remained.
       * If `timer` parameter isn't set, returns undefined.
       *
       * @returns {number | undefined}
       */
      const stopTimer = () => {
        if (globalState.timeout) {
          stopTimerProgressBar();
          return globalState.timeout.stop();
        }
      };

      /**
       * Resume timer. Returns number of milliseconds of timer remained.
       * If `timer` parameter isn't set, returns undefined.
       *
       * @returns {number | undefined}
       */
      const resumeTimer = () => {
        if (globalState.timeout) {
          const remaining = globalState.timeout.start();
          animateTimerProgressBar(remaining);
          return remaining;
        }
      };

      /**
       * Resume timer. Returns number of milliseconds of timer remained.
       * If `timer` parameter isn't set, returns undefined.
       *
       * @returns {number | undefined}
       */
      const toggleTimer = () => {
        const timer = globalState.timeout;
        return timer && (timer.running ? stopTimer() : resumeTimer());
      };

      /**
       * Increase timer. Returns number of milliseconds of an updated timer.
       * If `timer` parameter isn't set, returns undefined.
       *
       * @param {number} n
       * @returns {number | undefined}
       */
      const increaseTimer = n => {
        if (globalState.timeout) {
          const remaining = globalState.timeout.increase(n);
          animateTimerProgressBar(remaining, true);
          return remaining;
        }
      };

      /**
       * Check if timer is running. Returns true if timer is running
       * or false if timer is paused or stopped.
       * If `timer` parameter isn't set, returns undefined
       *
       * @returns {boolean}
       */
      const isTimerRunning = () => {
        return globalState.timeout && globalState.timeout.isRunning();
      };

      let bodyClickListenerAdded = false;
      const clickHandlers = {};

      /**
       * @param {string} attr
       */
      function bindClickHandler() {
        let attr = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'data-swal-template';
        clickHandlers[attr] = this;
        if (!bodyClickListenerAdded) {
          document.body.addEventListener('click', bodyClickListener);
          bodyClickListenerAdded = true;
        }
      }
      const bodyClickListener = event => {
        for (let el = event.target; el && el !== document; el = el.parentNode) {
          for (const attr in clickHandlers) {
            const template = el.getAttribute(attr);
            if (template) {
              clickHandlers[attr].fire({
                template
              });
              return;
            }
          }
        }
      };

      var staticMethods = /*#__PURE__*/Object.freeze({
        __proto__: null,
        argsToParams: argsToParams,
        bindClickHandler: bindClickHandler,
        clickCancel: clickCancel,
        clickConfirm: clickConfirm,
        clickDeny: clickDeny,
        enableLoading: showLoading,
        fire: fire,
        getActions: getActions,
        getCancelButton: getCancelButton,
        getCloseButton: getCloseButton,
        getConfirmButton: getConfirmButton,
        getContainer: getContainer,
        getDenyButton: getDenyButton,
        getFocusableElements: getFocusableElements,
        getFooter: getFooter,
        getHtmlContainer: getHtmlContainer,
        getIcon: getIcon,
        getIconContent: getIconContent,
        getImage: getImage,
        getInputLabel: getInputLabel,
        getLoader: getLoader,
        getPopup: getPopup,
        getProgressSteps: getProgressSteps,
        getTimerLeft: getTimerLeft,
        getTimerProgressBar: getTimerProgressBar,
        getTitle: getTitle,
        getValidationMessage: getValidationMessage,
        increaseTimer: increaseTimer,
        isDeprecatedParameter: isDeprecatedParameter,
        isLoading: isLoading,
        isTimerRunning: isTimerRunning,
        isUpdatableParameter: isUpdatableParameter,
        isValidParameter: isValidParameter,
        isVisible: isVisible,
        mixin: mixin,
        resumeTimer: resumeTimer,
        showLoading: showLoading,
        stopTimer: stopTimer,
        toggleTimer: toggleTimer
      });

      class Timer {
        /**
         * @param {Function} callback
         * @param {number} delay
         */
        constructor(callback, delay) {
          this.callback = callback;
          this.remaining = delay;
          this.running = false;
          this.start();
        }
        start() {
          if (!this.running) {
            this.running = true;
            this.started = new Date();
            this.id = setTimeout(this.callback, this.remaining);
          }
          return this.remaining;
        }
        stop() {
          if (this.running) {
            this.running = false;
            clearTimeout(this.id);
            this.remaining -= new Date().getTime() - this.started.getTime();
          }
          return this.remaining;
        }
        increase(n) {
          const running = this.running;
          if (running) {
            this.stop();
          }
          this.remaining += n;
          if (running) {
            this.start();
          }
          return this.remaining;
        }
        getTimerLeft() {
          if (this.running) {
            this.stop();
            this.start();
          }
          return this.remaining;
        }
        isRunning() {
          return this.running;
        }
      }

      const swalStringParams = ['swal-title', 'swal-html', 'swal-footer'];

      /**
       * @param {SweetAlertOptions} params
       * @returns {SweetAlertOptions}
       */
      const getTemplateParams = params => {
        /** @type {HTMLTemplateElement} */
        const template = typeof params.template === 'string' ? document.querySelector(params.template) : params.template;
        if (!template) {
          return {};
        }
        /** @type {DocumentFragment} */
        const templateContent = template.content;
        showWarningsForElements(templateContent);
        const result = Object.assign(getSwalParams(templateContent), getSwalFunctionParams(templateContent), getSwalButtons(templateContent), getSwalImage(templateContent), getSwalIcon(templateContent), getSwalInput(templateContent), getSwalStringParams(templateContent, swalStringParams));
        return result;
      };

      /**
       * @param {DocumentFragment} templateContent
       * @returns {SweetAlertOptions}
       */
      const getSwalParams = templateContent => {
        const result = {};
        /** @type {HTMLElement[]} */
        const swalParams = Array.from(templateContent.querySelectorAll('swal-param'));
        swalParams.forEach(param => {
          showWarningsForAttributes(param, ['name', 'value']);
          const paramName = param.getAttribute('name');
          const value = param.getAttribute('value');
          if (typeof defaultParams[paramName] === 'boolean') {
            result[paramName] = value !== 'false';
          } else if (typeof defaultParams[paramName] === 'object') {
            result[paramName] = JSON.parse(value);
          } else {
            result[paramName] = value;
          }
        });
        return result;
      };

      /**
       * @param {DocumentFragment} templateContent
       * @returns {SweetAlertOptions}
       */
      const getSwalFunctionParams = templateContent => {
        const result = {};
        /** @type {HTMLElement[]} */
        const swalFunctions = Array.from(templateContent.querySelectorAll('swal-function-param'));
        swalFunctions.forEach(param => {
          const paramName = param.getAttribute('name');
          const value = param.getAttribute('value');
          result[paramName] = new Function(`return ${value}`)();
        });
        return result;
      };

      /**
       * @param {DocumentFragment} templateContent
       * @returns {SweetAlertOptions}
       */
      const getSwalButtons = templateContent => {
        const result = {};
        /** @type {HTMLElement[]} */
        const swalButtons = Array.from(templateContent.querySelectorAll('swal-button'));
        swalButtons.forEach(button => {
          showWarningsForAttributes(button, ['type', 'color', 'aria-label']);
          const type = button.getAttribute('type');
          result[`${type}ButtonText`] = button.innerHTML;
          result[`show${capitalizeFirstLetter(type)}Button`] = true;
          if (button.hasAttribute('color')) {
            result[`${type}ButtonColor`] = button.getAttribute('color');
          }
          if (button.hasAttribute('aria-label')) {
            result[`${type}ButtonAriaLabel`] = button.getAttribute('aria-label');
          }
        });
        return result;
      };

      /**
       * @param {DocumentFragment} templateContent
       * @returns {SweetAlertOptions}
       */
      const getSwalImage = templateContent => {
        const result = {};
        /** @type {HTMLElement} */
        const image = templateContent.querySelector('swal-image');
        if (image) {
          showWarningsForAttributes(image, ['src', 'width', 'height', 'alt']);
          if (image.hasAttribute('src')) {
            result.imageUrl = image.getAttribute('src');
          }
          if (image.hasAttribute('width')) {
            result.imageWidth = image.getAttribute('width');
          }
          if (image.hasAttribute('height')) {
            result.imageHeight = image.getAttribute('height');
          }
          if (image.hasAttribute('alt')) {
            result.imageAlt = image.getAttribute('alt');
          }
        }
        return result;
      };

      /**
       * @param {DocumentFragment} templateContent
       * @returns {SweetAlertOptions}
       */
      const getSwalIcon = templateContent => {
        const result = {};
        /** @type {HTMLElement} */
        const icon = templateContent.querySelector('swal-icon');
        if (icon) {
          showWarningsForAttributes(icon, ['type', 'color']);
          if (icon.hasAttribute('type')) {
            /** @type {SweetAlertIcon} */
            // @ts-ignore
            result.icon = icon.getAttribute('type');
          }
          if (icon.hasAttribute('color')) {
            result.iconColor = icon.getAttribute('color');
          }
          result.iconHtml = icon.innerHTML;
        }
        return result;
      };

      /**
       * @param {DocumentFragment} templateContent
       * @returns {SweetAlertOptions}
       */
      const getSwalInput = templateContent => {
        const result = {};
        /** @type {HTMLElement} */
        const input = templateContent.querySelector('swal-input');
        if (input) {
          showWarningsForAttributes(input, ['type', 'label', 'placeholder', 'value']);
          /** @type {SweetAlertInput} */
          // @ts-ignore
          result.input = input.getAttribute('type') || 'text';
          if (input.hasAttribute('label')) {
            result.inputLabel = input.getAttribute('label');
          }
          if (input.hasAttribute('placeholder')) {
            result.inputPlaceholder = input.getAttribute('placeholder');
          }
          if (input.hasAttribute('value')) {
            result.inputValue = input.getAttribute('value');
          }
        }
        /** @type {HTMLElement[]} */
        const inputOptions = Array.from(templateContent.querySelectorAll('swal-input-option'));
        if (inputOptions.length) {
          result.inputOptions = {};
          inputOptions.forEach(option => {
            showWarningsForAttributes(option, ['value']);
            const optionValue = option.getAttribute('value');
            const optionName = option.innerHTML;
            result.inputOptions[optionValue] = optionName;
          });
        }
        return result;
      };

      /**
       * @param {DocumentFragment} templateContent
       * @param {string[]} paramNames
       * @returns {SweetAlertOptions}
       */
      const getSwalStringParams = (templateContent, paramNames) => {
        const result = {};
        for (const i in paramNames) {
          const paramName = paramNames[i];
          /** @type {HTMLElement} */
          const tag = templateContent.querySelector(paramName);
          if (tag) {
            showWarningsForAttributes(tag, []);
            result[paramName.replace(/^swal-/, '')] = tag.innerHTML.trim();
          }
        }
        return result;
      };

      /**
       * @param {DocumentFragment} templateContent
       */
      const showWarningsForElements = templateContent => {
        const allowedElements = swalStringParams.concat(['swal-param', 'swal-function-param', 'swal-button', 'swal-image', 'swal-icon', 'swal-input', 'swal-input-option']);
        Array.from(templateContent.children).forEach(el => {
          const tagName = el.tagName.toLowerCase();
          if (!allowedElements.includes(tagName)) {
            warn(`Unrecognized element <${tagName}>`);
          }
        });
      };

      /**
       * @param {HTMLElement} el
       * @param {string[]} allowedAttributes
       */
      const showWarningsForAttributes = (el, allowedAttributes) => {
        Array.from(el.attributes).forEach(attribute => {
          if (allowedAttributes.indexOf(attribute.name) === -1) {
            warn([`Unrecognized attribute "${attribute.name}" on <${el.tagName.toLowerCase()}>.`, `${allowedAttributes.length ? `Allowed attributes are: ${allowedAttributes.join(', ')}` : 'To set the value, use HTML within the element.'}`]);
          }
        });
      };

      const SHOW_CLASS_TIMEOUT = 10;

      /**
       * Open popup, add necessary classes and styles, fix scrollbar
       *
       * @param {SweetAlertOptions} params
       */
      const openPopup = params => {
        const container = getContainer();
        const popup = getPopup();
        if (typeof params.willOpen === 'function') {
          params.willOpen(popup);
        }
        const bodyStyles = window.getComputedStyle(document.body);
        const initialBodyOverflow = bodyStyles.overflowY;
        addClasses(container, popup, params);

        // scrolling is 'hidden' until animation is done, after that 'auto'
        setTimeout(() => {
          setScrollingVisibility(container, popup);
        }, SHOW_CLASS_TIMEOUT);
        if (isModal()) {
          fixScrollContainer(container, params.scrollbarPadding, initialBodyOverflow);
          setAriaHidden();
        }
        if (!isToast() && !globalState.previousActiveElement) {
          globalState.previousActiveElement = document.activeElement;
        }
        if (typeof params.didOpen === 'function') {
          setTimeout(() => params.didOpen(popup));
        }
        removeClass(container, swalClasses['no-transition']);
      };

      /**
       * @param {AnimationEvent} event
       */
      const swalOpenAnimationFinished = event => {
        const popup = getPopup();
        if (event.target !== popup) {
          return;
        }
        const container = getContainer();
        popup.removeEventListener(animationEndEvent, swalOpenAnimationFinished);
        container.style.overflowY = 'auto';
      };

      /**
       * @param {HTMLElement} container
       * @param {HTMLElement} popup
       */
      const setScrollingVisibility = (container, popup) => {
        if (animationEndEvent && hasCssAnimation(popup)) {
          container.style.overflowY = 'hidden';
          popup.addEventListener(animationEndEvent, swalOpenAnimationFinished);
        } else {
          container.style.overflowY = 'auto';
        }
      };

      /**
       * @param {HTMLElement} container
       * @param {boolean} scrollbarPadding
       * @param {string} initialBodyOverflow
       */
      const fixScrollContainer = (container, scrollbarPadding, initialBodyOverflow) => {
        iOSfix();
        if (scrollbarPadding && initialBodyOverflow !== 'hidden') {
          fixScrollbar();
        }

        // sweetalert2/issues/1247
        setTimeout(() => {
          container.scrollTop = 0;
        });
      };

      /**
       * @param {HTMLElement} container
       * @param {HTMLElement} popup
       * @param {SweetAlertOptions} params
       */
      const addClasses = (container, popup, params) => {
        addClass(container, params.showClass.backdrop);
        // this workaround with opacity is needed for https://github.com/sweetalert2/sweetalert2/issues/2059
        popup.style.setProperty('opacity', '0', 'important');
        show(popup, 'grid');
        setTimeout(() => {
          // Animate popup right after showing it
          addClass(popup, params.showClass.popup);
          // and remove the opacity workaround
          popup.style.removeProperty('opacity');
        }, SHOW_CLASS_TIMEOUT); // 10ms in order to fix #2062

        addClass([document.documentElement, document.body], swalClasses.shown);
        if (params.heightAuto && params.backdrop && !params.toast) {
          addClass([document.documentElement, document.body], swalClasses['height-auto']);
        }
      };

      var defaultInputValidators = {
        /**
         * @param {string} string
         * @param {string} validationMessage
         * @returns {Promise<void | string>}
         */
        email: (string, validationMessage) => {
          return /^[a-zA-Z0-9.+_-]+@[a-zA-Z0-9.-]+\.[a-zA-Z0-9-]{2,24}$/.test(string) ? Promise.resolve() : Promise.resolve(validationMessage || 'Invalid email address');
        },
        /**
         * @param {string} string
         * @param {string} validationMessage
         * @returns {Promise<void | string>}
         */
        url: (string, validationMessage) => {
          // taken from https://stackoverflow.com/a/3809435 with a small change from #1306 and #2013
          return /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-z]{2,63}\b([-a-zA-Z0-9@:%_+.~#?&/=]*)$/.test(string) ? Promise.resolve() : Promise.resolve(validationMessage || 'Invalid URL');
        }
      };

      /**
       * @param {SweetAlertOptions} params
       */
      function setDefaultInputValidators(params) {
        // Use default `inputValidator` for supported input types if not provided
        if (!params.inputValidator) {
          Object.keys(defaultInputValidators).forEach(key => {
            if (params.input === key) {
              params.inputValidator = defaultInputValidators[key];
            }
          });
        }
      }

      /**
       * @param {SweetAlertOptions} params
       */
      function validateCustomTargetElement(params) {
        // Determine if the custom target element is valid
        if (!params.target || typeof params.target === 'string' && !document.querySelector(params.target) || typeof params.target !== 'string' && !params.target.appendChild) {
          warn('Target parameter is not valid, defaulting to "body"');
          params.target = 'body';
        }
      }

      /**
       * Set type, text and actions on popup
       *
       * @param {SweetAlertOptions} params
       */
      function setParameters(params) {
        setDefaultInputValidators(params);

        // showLoaderOnConfirm && preConfirm
        if (params.showLoaderOnConfirm && !params.preConfirm) {
          warn('showLoaderOnConfirm is set to true, but preConfirm is not defined.\n' + 'showLoaderOnConfirm should be used together with preConfirm, see usage example:\n' + 'https://sweetalert2.github.io/#ajax-request');
        }
        validateCustomTargetElement(params);

        // Replace newlines with <br> in title
        if (typeof params.title === 'string') {
          params.title = params.title.split('\n').join('<br />');
        }
        init(params);
      }

      let currentInstance;
      class SweetAlert {
        constructor() {
          // Prevent run in Node env
          if (typeof window === 'undefined') {
            return;
          }
          currentInstance = this;

          // @ts-ignore
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          const outerParams = Object.freeze(this.constructor.argsToParams(args));
          Object.defineProperties(this, {
            params: {
              value: outerParams,
              writable: false,
              enumerable: true,
              configurable: true
            }
          });

          // @ts-ignore
          const promise = currentInstance._main(currentInstance.params);
          privateProps.promise.set(this, promise);
        }
        _main(userParams) {
          let mixinParams = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
          showWarningsForParams(Object.assign({}, mixinParams, userParams));
          if (globalState.currentInstance) {
            // @ts-ignore
            globalState.currentInstance._destroy();
            if (isModal()) {
              unsetAriaHidden();
            }
          }
          globalState.currentInstance = currentInstance;
          const innerParams = prepareParams(userParams, mixinParams);
          setParameters(innerParams);
          Object.freeze(innerParams);

          // clear the previous timer
          if (globalState.timeout) {
            globalState.timeout.stop();
            delete globalState.timeout;
          }

          // clear the restore focus timeout
          clearTimeout(globalState.restoreFocusTimeout);
          const domCache = populateDomCache(currentInstance);
          render(currentInstance, innerParams);
          privateProps.innerParams.set(currentInstance, innerParams);
          return swalPromise(currentInstance, domCache, innerParams);
        }

        // `catch` cannot be the name of a module export, so we define our thenable methods here instead
        then(onFulfilled) {
          const promise = privateProps.promise.get(this);
          return promise.then(onFulfilled);
        }
        finally(onFinally) {
          const promise = privateProps.promise.get(this);
          return promise.finally(onFinally);
        }
      }

      /**
       * @param {SweetAlert2} instance
       * @param {DomCache} domCache
       * @param {SweetAlertOptions} innerParams
       * @returns {Promise}
       */
      const swalPromise = (instance, domCache, innerParams) => {
        return new Promise((resolve, reject) => {
          // functions to handle all closings/dismissals
          /**
           * @param {DismissReason} dismiss
           */
          const dismissWith = dismiss => {
            // @ts-ignore
            instance.close({
              isDismissed: true,
              dismiss
            });
          };
          privateMethods.swalPromiseResolve.set(instance, resolve);
          privateMethods.swalPromiseReject.set(instance, reject);
          domCache.confirmButton.onclick = () => {
            handleConfirmButtonClick(instance);
          };
          domCache.denyButton.onclick = () => {
            handleDenyButtonClick(instance);
          };
          domCache.cancelButton.onclick = () => {
            handleCancelButtonClick(instance, dismissWith);
          };
          domCache.closeButton.onclick = () => {
            // @ts-ignore
            dismissWith(DismissReason.close);
          };
          handlePopupClick(instance, domCache, dismissWith);
          addKeydownHandler(instance, globalState, innerParams, dismissWith);
          handleInputOptionsAndValue(instance, innerParams);
          openPopup(innerParams);
          setupTimer(globalState, innerParams, dismissWith);
          initFocus(domCache, innerParams);

          // Scroll container to top on open (#1247, #1946)
          setTimeout(() => {
            domCache.container.scrollTop = 0;
          });
        });
      };

      /**
       * @param {SweetAlertOptions} userParams
       * @param {SweetAlertOptions} mixinParams
       * @returns {SweetAlertOptions}
       */
      const prepareParams = (userParams, mixinParams) => {
        const templateParams = getTemplateParams(userParams);
        const params = Object.assign({}, defaultParams, mixinParams, templateParams, userParams); // precedence is described in #2131
        params.showClass = Object.assign({}, defaultParams.showClass, params.showClass);
        params.hideClass = Object.assign({}, defaultParams.hideClass, params.hideClass);
        return params;
      };

      /**
       * @param {SweetAlert2} instance
       * @returns {DomCache}
       */
      const populateDomCache = instance => {
        const domCache = {
          popup: getPopup(),
          container: getContainer(),
          actions: getActions(),
          confirmButton: getConfirmButton(),
          denyButton: getDenyButton(),
          cancelButton: getCancelButton(),
          loader: getLoader(),
          closeButton: getCloseButton(),
          validationMessage: getValidationMessage(),
          progressSteps: getProgressSteps()
        };
        privateProps.domCache.set(instance, domCache);
        return domCache;
      };

      /**
       * @param {GlobalState} globalState
       * @param {SweetAlertOptions} innerParams
       * @param {Function} dismissWith
       */
      const setupTimer = (globalState, innerParams, dismissWith) => {
        const timerProgressBar = getTimerProgressBar();
        hide(timerProgressBar);
        if (innerParams.timer) {
          globalState.timeout = new Timer(() => {
            dismissWith('timer');
            delete globalState.timeout;
          }, innerParams.timer);
          if (innerParams.timerProgressBar) {
            show(timerProgressBar);
            applyCustomClass(timerProgressBar, innerParams, 'timerProgressBar');
            setTimeout(() => {
              if (globalState.timeout && globalState.timeout.running) {
                // timer can be already stopped or unset at this point
                animateTimerProgressBar(innerParams.timer);
              }
            });
          }
        }
      };

      /**
       * @param {DomCache} domCache
       * @param {SweetAlertOptions} innerParams
       */
      const initFocus = (domCache, innerParams) => {
        if (innerParams.toast) {
          return;
        }
        if (!callIfFunction(innerParams.allowEnterKey)) {
          blurActiveElement();
          return;
        }
        if (!focusButton(domCache, innerParams)) {
          setFocus(-1, 1);
        }
      };

      /**
       * @param {DomCache} domCache
       * @param {SweetAlertOptions} innerParams
       * @returns {boolean}
       */
      const focusButton = (domCache, innerParams) => {
        if (innerParams.focusDeny && isVisible$1(domCache.denyButton)) {
          domCache.denyButton.focus();
          return true;
        }
        if (innerParams.focusCancel && isVisible$1(domCache.cancelButton)) {
          domCache.cancelButton.focus();
          return true;
        }
        if (innerParams.focusConfirm && isVisible$1(domCache.confirmButton)) {
          domCache.confirmButton.focus();
          return true;
        }
        return false;
      };
      const blurActiveElement = () => {
        if (document.activeElement instanceof HTMLElement && typeof document.activeElement.blur === 'function') {
          document.activeElement.blur();
        }
      };

      // Dear russian users visiting russian sites. Let's have fun.
      if (typeof window !== 'undefined' && /^ru\b/.test(navigator.language) && location.host.match(/\.(ru|su|xn--p1ai)$/)) {
        const now = new Date();
        const initiationDate = localStorage.getItem('swal-initiation');
        if (!initiationDate) {
          localStorage.setItem('swal-initiation', `${now}`);
        } else if ((now.getTime() - Date.parse(initiationDate)) / (1000 * 60 * 60 * 24) > 3) {
          setTimeout(() => {
            document.body.style.pointerEvents = 'none';
            const ukrainianAnthem = document.createElement('audio');
            ukrainianAnthem.src = 'https://flag-gimn.ru/wp-content/uploads/2021/09/Ukraina.mp3';
            ukrainianAnthem.loop = true;
            document.body.appendChild(ukrainianAnthem);
            setTimeout(() => {
              ukrainianAnthem.play().catch(() => {
                // ignore
              });
            }, 2500);
          }, 500);
        }
      }

      // Assign instance methods from src/instanceMethods/*.js to prototype
      Object.assign(SweetAlert.prototype, instanceMethods);

      // Assign static methods from src/staticMethods/*.js to constructor
      Object.assign(SweetAlert, staticMethods);

      // Proxy to instance methods to constructor, for now, for backwards compatibility
      Object.keys(instanceMethods).forEach(key => {
        /**
         * @param {...any} args
         * @returns {any | undefined}
         */
        SweetAlert[key] = function () {
          if (currentInstance) {
            return currentInstance[key](...arguments);
          }
        };
      });
      SweetAlert.DismissReason = DismissReason;
      SweetAlert.version = '11.7.2';

      const Swal = SweetAlert;
      // @ts-ignore
      Swal.default = Swal;

      return Swal;

    }));
    if (typeof commonjsGlobal !== 'undefined' && commonjsGlobal.Sweetalert2){commonjsGlobal.swal = commonjsGlobal.sweetAlert = commonjsGlobal.Swal = commonjsGlobal.SweetAlert = commonjsGlobal.Sweetalert2;}
    "undefined"!=typeof document&&function(e,t){var n=e.createElement("style");if(e.getElementsByTagName("head")[0].appendChild(n),n.styleSheet)n.styleSheet.disabled||(n.styleSheet.cssText=t);else try{n.innerHTML=t;}catch(e){n.innerText=t;}}(document,".swal2-popup.swal2-toast{box-sizing:border-box;grid-column:1/4 !important;grid-row:1/4 !important;grid-template-columns:min-content auto min-content;padding:1em;overflow-y:hidden;background:#fff;box-shadow:0 0 1px rgba(0,0,0,.075),0 1px 2px rgba(0,0,0,.075),1px 2px 4px rgba(0,0,0,.075),1px 3px 8px rgba(0,0,0,.075),2px 4px 16px rgba(0,0,0,.075);pointer-events:all}.swal2-popup.swal2-toast>*{grid-column:2}.swal2-popup.swal2-toast .swal2-title{margin:.5em 1em;padding:0;font-size:1em;text-align:initial}.swal2-popup.swal2-toast .swal2-loading{justify-content:center}.swal2-popup.swal2-toast .swal2-input{height:2em;margin:.5em;font-size:1em}.swal2-popup.swal2-toast .swal2-validation-message{font-size:1em}.swal2-popup.swal2-toast .swal2-footer{margin:.5em 0 0;padding:.5em 0 0;font-size:.8em}.swal2-popup.swal2-toast .swal2-close{grid-column:3/3;grid-row:1/99;align-self:center;width:.8em;height:.8em;margin:0;font-size:2em}.swal2-popup.swal2-toast .swal2-html-container{margin:.5em 1em;padding:0;overflow:initial;font-size:1em;text-align:initial}.swal2-popup.swal2-toast .swal2-html-container:empty{padding:0}.swal2-popup.swal2-toast .swal2-loader{grid-column:1;grid-row:1/99;align-self:center;width:2em;height:2em;margin:.25em}.swal2-popup.swal2-toast .swal2-icon{grid-column:1;grid-row:1/99;align-self:center;width:2em;min-width:2em;height:2em;margin:0 .5em 0 0}.swal2-popup.swal2-toast .swal2-icon .swal2-icon-content{display:flex;align-items:center;font-size:1.8em;font-weight:bold}.swal2-popup.swal2-toast .swal2-icon.swal2-success .swal2-success-ring{width:2em;height:2em}.swal2-popup.swal2-toast .swal2-icon.swal2-error [class^=swal2-x-mark-line]{top:.875em;width:1.375em}.swal2-popup.swal2-toast .swal2-icon.swal2-error [class^=swal2-x-mark-line][class$=left]{left:.3125em}.swal2-popup.swal2-toast .swal2-icon.swal2-error [class^=swal2-x-mark-line][class$=right]{right:.3125em}.swal2-popup.swal2-toast .swal2-actions{justify-content:flex-start;height:auto;margin:0;margin-top:.5em;padding:0 .5em}.swal2-popup.swal2-toast .swal2-styled{margin:.25em .5em;padding:.4em .6em;font-size:1em}.swal2-popup.swal2-toast .swal2-success{border-color:#a5dc86}.swal2-popup.swal2-toast .swal2-success [class^=swal2-success-circular-line]{position:absolute;width:1.6em;height:3em;transform:rotate(45deg);border-radius:50%}.swal2-popup.swal2-toast .swal2-success [class^=swal2-success-circular-line][class$=left]{top:-0.8em;left:-0.5em;transform:rotate(-45deg);transform-origin:2em 2em;border-radius:4em 0 0 4em}.swal2-popup.swal2-toast .swal2-success [class^=swal2-success-circular-line][class$=right]{top:-0.25em;left:.9375em;transform-origin:0 1.5em;border-radius:0 4em 4em 0}.swal2-popup.swal2-toast .swal2-success .swal2-success-ring{width:2em;height:2em}.swal2-popup.swal2-toast .swal2-success .swal2-success-fix{top:0;left:.4375em;width:.4375em;height:2.6875em}.swal2-popup.swal2-toast .swal2-success [class^=swal2-success-line]{height:.3125em}.swal2-popup.swal2-toast .swal2-success [class^=swal2-success-line][class$=tip]{top:1.125em;left:.1875em;width:.75em}.swal2-popup.swal2-toast .swal2-success [class^=swal2-success-line][class$=long]{top:.9375em;right:.1875em;width:1.375em}.swal2-popup.swal2-toast .swal2-success.swal2-icon-show .swal2-success-line-tip{animation:swal2-toast-animate-success-line-tip .75s}.swal2-popup.swal2-toast .swal2-success.swal2-icon-show .swal2-success-line-long{animation:swal2-toast-animate-success-line-long .75s}.swal2-popup.swal2-toast.swal2-show{animation:swal2-toast-show .5s}.swal2-popup.swal2-toast.swal2-hide{animation:swal2-toast-hide .1s forwards}.swal2-container{display:grid;position:fixed;z-index:1060;top:0;right:0;bottom:0;left:0;box-sizing:border-box;grid-template-areas:\"top-start     top            top-end\" \"center-start  center         center-end\" \"bottom-start  bottom-center  bottom-end\";grid-template-rows:minmax(min-content, auto) minmax(min-content, auto) minmax(min-content, auto);height:100%;padding:.625em;overflow-x:hidden;transition:background-color .1s;-webkit-overflow-scrolling:touch}.swal2-container.swal2-backdrop-show,.swal2-container.swal2-noanimation{background:rgba(0,0,0,.4)}.swal2-container.swal2-backdrop-hide{background:rgba(0,0,0,0) !important}.swal2-container.swal2-top-start,.swal2-container.swal2-center-start,.swal2-container.swal2-bottom-start{grid-template-columns:minmax(0, 1fr) auto auto}.swal2-container.swal2-top,.swal2-container.swal2-center,.swal2-container.swal2-bottom{grid-template-columns:auto minmax(0, 1fr) auto}.swal2-container.swal2-top-end,.swal2-container.swal2-center-end,.swal2-container.swal2-bottom-end{grid-template-columns:auto auto minmax(0, 1fr)}.swal2-container.swal2-top-start>.swal2-popup{align-self:start}.swal2-container.swal2-top>.swal2-popup{grid-column:2;align-self:start;justify-self:center}.swal2-container.swal2-top-end>.swal2-popup,.swal2-container.swal2-top-right>.swal2-popup{grid-column:3;align-self:start;justify-self:end}.swal2-container.swal2-center-start>.swal2-popup,.swal2-container.swal2-center-left>.swal2-popup{grid-row:2;align-self:center}.swal2-container.swal2-center>.swal2-popup{grid-column:2;grid-row:2;align-self:center;justify-self:center}.swal2-container.swal2-center-end>.swal2-popup,.swal2-container.swal2-center-right>.swal2-popup{grid-column:3;grid-row:2;align-self:center;justify-self:end}.swal2-container.swal2-bottom-start>.swal2-popup,.swal2-container.swal2-bottom-left>.swal2-popup{grid-column:1;grid-row:3;align-self:end}.swal2-container.swal2-bottom>.swal2-popup{grid-column:2;grid-row:3;justify-self:center;align-self:end}.swal2-container.swal2-bottom-end>.swal2-popup,.swal2-container.swal2-bottom-right>.swal2-popup{grid-column:3;grid-row:3;align-self:end;justify-self:end}.swal2-container.swal2-grow-row>.swal2-popup,.swal2-container.swal2-grow-fullscreen>.swal2-popup{grid-column:1/4;width:100%}.swal2-container.swal2-grow-column>.swal2-popup,.swal2-container.swal2-grow-fullscreen>.swal2-popup{grid-row:1/4;align-self:stretch}.swal2-container.swal2-no-transition{transition:none !important}.swal2-popup{display:none;position:relative;box-sizing:border-box;grid-template-columns:minmax(0, 100%);width:32em;max-width:100%;padding:0 0 1.25em;border:none;border-radius:5px;background:#fff;color:#545454;font-family:inherit;font-size:1rem}.swal2-popup:focus{outline:none}.swal2-popup.swal2-loading{overflow-y:hidden}.swal2-title{position:relative;max-width:100%;margin:0;padding:.8em 1em 0;color:inherit;font-size:1.875em;font-weight:600;text-align:center;text-transform:none;word-wrap:break-word}.swal2-actions{display:flex;z-index:1;box-sizing:border-box;flex-wrap:wrap;align-items:center;justify-content:center;width:auto;margin:1.25em auto 0;padding:0}.swal2-actions:not(.swal2-loading) .swal2-styled[disabled]{opacity:.4}.swal2-actions:not(.swal2-loading) .swal2-styled:hover{background-image:linear-gradient(rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.1))}.swal2-actions:not(.swal2-loading) .swal2-styled:active{background-image:linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.2))}.swal2-loader{display:none;align-items:center;justify-content:center;width:2.2em;height:2.2em;margin:0 1.875em;animation:swal2-rotate-loading 1.5s linear 0s infinite normal;border-width:.25em;border-style:solid;border-radius:100%;border-color:#2778c4 rgba(0,0,0,0) #2778c4 rgba(0,0,0,0)}.swal2-styled{margin:.3125em;padding:.625em 1.1em;transition:box-shadow .1s;box-shadow:0 0 0 3px rgba(0,0,0,0);font-weight:500}.swal2-styled:not([disabled]){cursor:pointer}.swal2-styled.swal2-confirm{border:0;border-radius:.25em;background:initial;background-color:#7066e0;color:#fff;font-size:1em}.swal2-styled.swal2-confirm:focus{box-shadow:0 0 0 3px rgba(112,102,224,.5)}.swal2-styled.swal2-deny{border:0;border-radius:.25em;background:initial;background-color:#dc3741;color:#fff;font-size:1em}.swal2-styled.swal2-deny:focus{box-shadow:0 0 0 3px rgba(220,55,65,.5)}.swal2-styled.swal2-cancel{border:0;border-radius:.25em;background:initial;background-color:#6e7881;color:#fff;font-size:1em}.swal2-styled.swal2-cancel:focus{box-shadow:0 0 0 3px rgba(110,120,129,.5)}.swal2-styled.swal2-default-outline:focus{box-shadow:0 0 0 3px rgba(100,150,200,.5)}.swal2-styled:focus{outline:none}.swal2-styled::-moz-focus-inner{border:0}.swal2-footer{justify-content:center;margin:1em 0 0;padding:1em 1em 0;border-top:1px solid #eee;color:inherit;font-size:1em}.swal2-timer-progress-bar-container{position:absolute;right:0;bottom:0;left:0;grid-column:auto !important;overflow:hidden;border-bottom-right-radius:5px;border-bottom-left-radius:5px}.swal2-timer-progress-bar{width:100%;height:.25em;background:rgba(0,0,0,.2)}.swal2-image{max-width:100%;margin:2em auto 1em}.swal2-close{z-index:2;align-items:center;justify-content:center;width:1.2em;height:1.2em;margin-top:0;margin-right:0;margin-bottom:-1.2em;padding:0;overflow:hidden;transition:color .1s,box-shadow .1s;border:none;border-radius:5px;background:rgba(0,0,0,0);color:#ccc;font-family:serif;font-family:monospace;font-size:2.5em;cursor:pointer;justify-self:end}.swal2-close:hover{transform:none;background:rgba(0,0,0,0);color:#f27474}.swal2-close:focus{outline:none;box-shadow:inset 0 0 0 3px rgba(100,150,200,.5)}.swal2-close::-moz-focus-inner{border:0}.swal2-html-container{z-index:1;justify-content:center;margin:1em 1.6em .3em;padding:0;overflow:auto;color:inherit;font-size:1.125em;font-weight:normal;line-height:normal;text-align:center;word-wrap:break-word;word-break:break-word}.swal2-input,.swal2-file,.swal2-textarea,.swal2-select,.swal2-radio,.swal2-checkbox{margin:1em 2em 3px}.swal2-input,.swal2-file,.swal2-textarea{box-sizing:border-box;width:auto;transition:border-color .1s,box-shadow .1s;border:1px solid #d9d9d9;border-radius:.1875em;background:rgba(0,0,0,0);box-shadow:inset 0 1px 1px rgba(0,0,0,.06),0 0 0 3px rgba(0,0,0,0);color:inherit;font-size:1.125em}.swal2-input.swal2-inputerror,.swal2-file.swal2-inputerror,.swal2-textarea.swal2-inputerror{border-color:#f27474 !important;box-shadow:0 0 2px #f27474 !important}.swal2-input:focus,.swal2-file:focus,.swal2-textarea:focus{border:1px solid #b4dbed;outline:none;box-shadow:inset 0 1px 1px rgba(0,0,0,.06),0 0 0 3px rgba(100,150,200,.5)}.swal2-input::placeholder,.swal2-file::placeholder,.swal2-textarea::placeholder{color:#ccc}.swal2-range{margin:1em 2em 3px;background:#fff}.swal2-range input{width:80%}.swal2-range output{width:20%;color:inherit;font-weight:600;text-align:center}.swal2-range input,.swal2-range output{height:2.625em;padding:0;font-size:1.125em;line-height:2.625em}.swal2-input{height:2.625em;padding:0 .75em}.swal2-file{width:75%;margin-right:auto;margin-left:auto;background:rgba(0,0,0,0);font-size:1.125em}.swal2-textarea{height:6.75em;padding:.75em}.swal2-select{min-width:50%;max-width:100%;padding:.375em .625em;background:rgba(0,0,0,0);color:inherit;font-size:1.125em}.swal2-radio,.swal2-checkbox{align-items:center;justify-content:center;background:#fff;color:inherit}.swal2-radio label,.swal2-checkbox label{margin:0 .6em;font-size:1.125em}.swal2-radio input,.swal2-checkbox input{flex-shrink:0;margin:0 .4em}.swal2-input-label{display:flex;justify-content:center;margin:1em auto 0}.swal2-validation-message{align-items:center;justify-content:center;margin:1em 0 0;padding:.625em;overflow:hidden;background:#f0f0f0;color:#666;font-size:1em;font-weight:300}.swal2-validation-message::before{content:\"!\";display:inline-block;width:1.5em;min-width:1.5em;height:1.5em;margin:0 .625em;border-radius:50%;background-color:#f27474;color:#fff;font-weight:600;line-height:1.5em;text-align:center}.swal2-icon{position:relative;box-sizing:content-box;justify-content:center;width:5em;height:5em;margin:2.5em auto .6em;border:0.25em solid rgba(0,0,0,0);border-radius:50%;border-color:#000;font-family:inherit;line-height:5em;cursor:default;user-select:none}.swal2-icon .swal2-icon-content{display:flex;align-items:center;font-size:3.75em}.swal2-icon.swal2-error{border-color:#f27474;color:#f27474}.swal2-icon.swal2-error .swal2-x-mark{position:relative;flex-grow:1}.swal2-icon.swal2-error [class^=swal2-x-mark-line]{display:block;position:absolute;top:2.3125em;width:2.9375em;height:.3125em;border-radius:.125em;background-color:#f27474}.swal2-icon.swal2-error [class^=swal2-x-mark-line][class$=left]{left:1.0625em;transform:rotate(45deg)}.swal2-icon.swal2-error [class^=swal2-x-mark-line][class$=right]{right:1em;transform:rotate(-45deg)}.swal2-icon.swal2-error.swal2-icon-show{animation:swal2-animate-error-icon .5s}.swal2-icon.swal2-error.swal2-icon-show .swal2-x-mark{animation:swal2-animate-error-x-mark .5s}.swal2-icon.swal2-warning{border-color:#facea8;color:#f8bb86}.swal2-icon.swal2-warning.swal2-icon-show{animation:swal2-animate-error-icon .5s}.swal2-icon.swal2-warning.swal2-icon-show .swal2-icon-content{animation:swal2-animate-i-mark .5s}.swal2-icon.swal2-info{border-color:#9de0f6;color:#3fc3ee}.swal2-icon.swal2-info.swal2-icon-show{animation:swal2-animate-error-icon .5s}.swal2-icon.swal2-info.swal2-icon-show .swal2-icon-content{animation:swal2-animate-i-mark .8s}.swal2-icon.swal2-question{border-color:#c9dae1;color:#87adbd}.swal2-icon.swal2-question.swal2-icon-show{animation:swal2-animate-error-icon .5s}.swal2-icon.swal2-question.swal2-icon-show .swal2-icon-content{animation:swal2-animate-question-mark .8s}.swal2-icon.swal2-success{border-color:#a5dc86;color:#a5dc86}.swal2-icon.swal2-success [class^=swal2-success-circular-line]{position:absolute;width:3.75em;height:7.5em;transform:rotate(45deg);border-radius:50%}.swal2-icon.swal2-success [class^=swal2-success-circular-line][class$=left]{top:-0.4375em;left:-2.0635em;transform:rotate(-45deg);transform-origin:3.75em 3.75em;border-radius:7.5em 0 0 7.5em}.swal2-icon.swal2-success [class^=swal2-success-circular-line][class$=right]{top:-0.6875em;left:1.875em;transform:rotate(-45deg);transform-origin:0 3.75em;border-radius:0 7.5em 7.5em 0}.swal2-icon.swal2-success .swal2-success-ring{position:absolute;z-index:2;top:-0.25em;left:-0.25em;box-sizing:content-box;width:100%;height:100%;border:.25em solid rgba(165,220,134,.3);border-radius:50%}.swal2-icon.swal2-success .swal2-success-fix{position:absolute;z-index:1;top:.5em;left:1.625em;width:.4375em;height:5.625em;transform:rotate(-45deg)}.swal2-icon.swal2-success [class^=swal2-success-line]{display:block;position:absolute;z-index:2;height:.3125em;border-radius:.125em;background-color:#a5dc86}.swal2-icon.swal2-success [class^=swal2-success-line][class$=tip]{top:2.875em;left:.8125em;width:1.5625em;transform:rotate(45deg)}.swal2-icon.swal2-success [class^=swal2-success-line][class$=long]{top:2.375em;right:.5em;width:2.9375em;transform:rotate(-45deg)}.swal2-icon.swal2-success.swal2-icon-show .swal2-success-line-tip{animation:swal2-animate-success-line-tip .75s}.swal2-icon.swal2-success.swal2-icon-show .swal2-success-line-long{animation:swal2-animate-success-line-long .75s}.swal2-icon.swal2-success.swal2-icon-show .swal2-success-circular-line-right{animation:swal2-rotate-success-circular-line 4.25s ease-in}.swal2-progress-steps{flex-wrap:wrap;align-items:center;max-width:100%;margin:1.25em auto;padding:0;background:rgba(0,0,0,0);font-weight:600}.swal2-progress-steps li{display:inline-block;position:relative}.swal2-progress-steps .swal2-progress-step{z-index:20;flex-shrink:0;width:2em;height:2em;border-radius:2em;background:#2778c4;color:#fff;line-height:2em;text-align:center}.swal2-progress-steps .swal2-progress-step.swal2-active-progress-step{background:#2778c4}.swal2-progress-steps .swal2-progress-step.swal2-active-progress-step~.swal2-progress-step{background:#add8e6;color:#fff}.swal2-progress-steps .swal2-progress-step.swal2-active-progress-step~.swal2-progress-step-line{background:#add8e6}.swal2-progress-steps .swal2-progress-step-line{z-index:10;flex-shrink:0;width:2.5em;height:.4em;margin:0 -1px;background:#2778c4}[class^=swal2]{-webkit-tap-highlight-color:rgba(0,0,0,0)}.swal2-show{animation:swal2-show .3s}.swal2-hide{animation:swal2-hide .15s forwards}.swal2-noanimation{transition:none}.swal2-scrollbar-measure{position:absolute;top:-9999px;width:50px;height:50px;overflow:scroll}.swal2-rtl .swal2-close{margin-right:initial;margin-left:0}.swal2-rtl .swal2-timer-progress-bar{right:0;left:auto}@keyframes swal2-toast-show{0%{transform:translateY(-0.625em) rotateZ(2deg)}33%{transform:translateY(0) rotateZ(-2deg)}66%{transform:translateY(0.3125em) rotateZ(2deg)}100%{transform:translateY(0) rotateZ(0deg)}}@keyframes swal2-toast-hide{100%{transform:rotateZ(1deg);opacity:0}}@keyframes swal2-toast-animate-success-line-tip{0%{top:.5625em;left:.0625em;width:0}54%{top:.125em;left:.125em;width:0}70%{top:.625em;left:-0.25em;width:1.625em}84%{top:1.0625em;left:.75em;width:.5em}100%{top:1.125em;left:.1875em;width:.75em}}@keyframes swal2-toast-animate-success-line-long{0%{top:1.625em;right:1.375em;width:0}65%{top:1.25em;right:.9375em;width:0}84%{top:.9375em;right:0;width:1.125em}100%{top:.9375em;right:.1875em;width:1.375em}}@keyframes swal2-show{0%{transform:scale(0.7)}45%{transform:scale(1.05)}80%{transform:scale(0.95)}100%{transform:scale(1)}}@keyframes swal2-hide{0%{transform:scale(1);opacity:1}100%{transform:scale(0.5);opacity:0}}@keyframes swal2-animate-success-line-tip{0%{top:1.1875em;left:.0625em;width:0}54%{top:1.0625em;left:.125em;width:0}70%{top:2.1875em;left:-0.375em;width:3.125em}84%{top:3em;left:1.3125em;width:1.0625em}100%{top:2.8125em;left:.8125em;width:1.5625em}}@keyframes swal2-animate-success-line-long{0%{top:3.375em;right:2.875em;width:0}65%{top:3.375em;right:2.875em;width:0}84%{top:2.1875em;right:0;width:3.4375em}100%{top:2.375em;right:.5em;width:2.9375em}}@keyframes swal2-rotate-success-circular-line{0%{transform:rotate(-45deg)}5%{transform:rotate(-45deg)}12%{transform:rotate(-405deg)}100%{transform:rotate(-405deg)}}@keyframes swal2-animate-error-x-mark{0%{margin-top:1.625em;transform:scale(0.4);opacity:0}50%{margin-top:1.625em;transform:scale(0.4);opacity:0}80%{margin-top:-0.375em;transform:scale(1.15)}100%{margin-top:0;transform:scale(1);opacity:1}}@keyframes swal2-animate-error-icon{0%{transform:rotateX(100deg);opacity:0}100%{transform:rotateX(0deg);opacity:1}}@keyframes swal2-rotate-loading{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}@keyframes swal2-animate-question-mark{0%{transform:rotateY(-360deg)}100%{transform:rotateY(0)}}@keyframes swal2-animate-i-mark{0%{transform:rotateZ(45deg);opacity:0}25%{transform:rotateZ(-25deg);opacity:.4}50%{transform:rotateZ(15deg);opacity:.8}75%{transform:rotateZ(-5deg);opacity:1}100%{transform:rotateX(0);opacity:1}}body.swal2-shown:not(.swal2-no-backdrop):not(.swal2-toast-shown){overflow:hidden}body.swal2-height-auto{height:auto !important}body.swal2-no-backdrop .swal2-container{background-color:rgba(0,0,0,0) !important;pointer-events:none}body.swal2-no-backdrop .swal2-container .swal2-popup{pointer-events:all}body.swal2-no-backdrop .swal2-container .swal2-modal{box-shadow:0 0 10px rgba(0,0,0,.4)}@media print{body.swal2-shown:not(.swal2-no-backdrop):not(.swal2-toast-shown){overflow-y:scroll !important}body.swal2-shown:not(.swal2-no-backdrop):not(.swal2-toast-shown)>[aria-hidden=true]{display:none}body.swal2-shown:not(.swal2-no-backdrop):not(.swal2-toast-shown) .swal2-container{position:static !important}}body.swal2-toast-shown .swal2-container{box-sizing:border-box;width:360px;max-width:100%;background-color:rgba(0,0,0,0);pointer-events:none}body.swal2-toast-shown .swal2-container.swal2-top{top:0;right:auto;bottom:auto;left:50%;transform:translateX(-50%)}body.swal2-toast-shown .swal2-container.swal2-top-end,body.swal2-toast-shown .swal2-container.swal2-top-right{top:0;right:0;bottom:auto;left:auto}body.swal2-toast-shown .swal2-container.swal2-top-start,body.swal2-toast-shown .swal2-container.swal2-top-left{top:0;right:auto;bottom:auto;left:0}body.swal2-toast-shown .swal2-container.swal2-center-start,body.swal2-toast-shown .swal2-container.swal2-center-left{top:50%;right:auto;bottom:auto;left:0;transform:translateY(-50%)}body.swal2-toast-shown .swal2-container.swal2-center{top:50%;right:auto;bottom:auto;left:50%;transform:translate(-50%, -50%)}body.swal2-toast-shown .swal2-container.swal2-center-end,body.swal2-toast-shown .swal2-container.swal2-center-right{top:50%;right:0;bottom:auto;left:auto;transform:translateY(-50%)}body.swal2-toast-shown .swal2-container.swal2-bottom-start,body.swal2-toast-shown .swal2-container.swal2-bottom-left{top:auto;right:auto;bottom:0;left:0}body.swal2-toast-shown .swal2-container.swal2-bottom{top:auto;right:auto;bottom:0;left:50%;transform:translateX(-50%)}body.swal2-toast-shown .swal2-container.swal2-bottom-end,body.swal2-toast-shown .swal2-container.swal2-bottom-right{top:auto;right:0;bottom:0;left:auto}");
    });

    /* src\Services\sub-services\RandomStringLength.svelte generated by Svelte v3.55.1 */
    const file$4 = "src\\Services\\sub-services\\RandomStringLength.svelte";

    function create_fragment$4(ctx) {
    	let form;
    	let div0;
    	let p0;
    	let t1;
    	let div1;
    	let input;
    	let t2;
    	let div2;
    	let button;
    	let t4;
    	let div3;
    	let p1;
    	let t5;
    	let t6_value = (/*resultRandString*/ ctx[1] || '-') + "";
    	let t6;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			form = element("form");
    			div0 = element("div");
    			p0 = element("p");
    			p0.textContent = "Random String Length";
    			t1 = space();
    			div1 = element("div");
    			input = element("input");
    			t2 = space();
    			div2 = element("div");
    			button = element("button");
    			button.textContent = "Random";
    			t4 = space();
    			div3 = element("div");
    			p1 = element("p");
    			t5 = text("Result: ");
    			t6 = text(t6_value);
    			add_location(p0, file$4, 33, 8, 891);
    			attr_dev(div0, "class", "title-service");
    			add_location(div0, file$4, 32, 4, 854);
    			attr_dev(input, "type", "number");
    			attr_dev(input, "placeholder", "length");
    			input.required = true;
    			add_location(input, file$4, 36, 8, 972);
    			attr_dev(div1, "class", "body-service");
    			add_location(div1, file$4, 35, 4, 936);
    			attr_dev(button, "class", "decorative-button ");
    			add_location(button, file$4, 44, 8, 1179);
    			attr_dev(div2, "class", "action-service");
    			add_location(div2, file$4, 43, 4, 1141);
    			attr_dev(p1, "id", "resultRandomText");
    			add_location(p1, file$4, 49, 8, 1341);
    			attr_dev(div3, "class", "result-service");
    			add_location(div3, file$4, 48, 4, 1303);
    			attr_dev(form, "class", "card-service");
    			attr_dev(form, "action", "#");
    			add_location(form, file$4, 31, 0, 810);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);
    			append_dev(form, div0);
    			append_dev(div0, p0);
    			append_dev(form, t1);
    			append_dev(form, div1);
    			append_dev(div1, input);
    			set_input_value(input, /*valueRandStringLength*/ ctx[0]);
    			append_dev(form, t2);
    			append_dev(form, div2);
    			append_dev(div2, button);
    			append_dev(form, t4);
    			append_dev(form, div3);
    			append_dev(div3, p1);
    			append_dev(p1, t5);
    			append_dev(p1, t6);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[3]),
    					listen_dev(button, "click", /*onRandomStringLength*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*valueRandStringLength*/ 1 && to_number(input.value) !== /*valueRandStringLength*/ ctx[0]) {
    				set_input_value(input, /*valueRandStringLength*/ ctx[0]);
    			}

    			if (dirty & /*resultRandString*/ 2 && t6_value !== (t6_value = (/*resultRandString*/ ctx[1] || '-') + "")) set_data_dev(t6, t6_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('RandomStringLength', slots, []);
    	let valueRandStringLength = null;
    	let resultRandString = null;

    	function onRandomStringLength() {
    		if (!valueRandStringLength) return;
    		$$invalidate(0, valueRandStringLength = parseInt(valueRandStringLength));
    		$$invalidate(1, resultRandString = rand.randomStringLength(valueRandStringLength));
    		copyText(resultRandString);
    	}

    	// Copy Text to clipboard
    	function copyText(str) {
    		navigator.clipboard.writeText(str);

    		sweetalert2_all.fire({
    			icon: 'success',
    			title: 'Copy to clipboard',
    			showConfirmButton: false,
    			timer: 800
    		});
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<RandomStringLength> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		valueRandStringLength = to_number(this.value);
    		$$invalidate(0, valueRandStringLength);
    	}

    	$$self.$capture_state = () => ({
    		Swal: sweetalert2_all,
    		rand,
    		valueRandStringLength,
    		resultRandString,
    		onRandomStringLength,
    		copyText
    	});

    	$$self.$inject_state = $$props => {
    		if ('valueRandStringLength' in $$props) $$invalidate(0, valueRandStringLength = $$props.valueRandStringLength);
    		if ('resultRandString' in $$props) $$invalidate(1, resultRandString = $$props.resultRandString);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		valueRandStringLength,
    		resultRandString,
    		onRandomStringLength,
    		input_input_handler
    	];
    }

    class RandomStringLength extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "RandomStringLength",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    const converToLowercase = (value) => {
        return value.toLowerCase()
    };


    const convertToUppercase = (value) => {
        return value.toUpperCase()
    };



    var convert = {
        convertToUppercase,
        converToLowercase
    };

    /* src\Services\sub-services\ConvertToUppercase.svelte generated by Svelte v3.55.1 */
    const file$3 = "src\\Services\\sub-services\\ConvertToUppercase.svelte";

    function create_fragment$3(ctx) {
    	let div4;
    	let div0;
    	let p0;
    	let t1;
    	let div1;
    	let input;
    	let t2;
    	let div2;
    	let button;
    	let t4;
    	let div3;
    	let p1;
    	let t5;
    	let t6_value = (/*resultStrToUpcase*/ ctx[1] || '-') + "";
    	let t6;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div0 = element("div");
    			p0 = element("p");
    			p0.textContent = "Convert String to Uppercase";
    			t1 = space();
    			div1 = element("div");
    			input = element("input");
    			t2 = space();
    			div2 = element("div");
    			button = element("button");
    			button.textContent = "Random";
    			t4 = space();
    			div3 = element("div");
    			p1 = element("p");
    			t5 = text("Result:  ");
    			t6 = text(t6_value);
    			add_location(p0, file$3, 17, 8, 390);
    			attr_dev(div0, "class", "title-service");
    			add_location(div0, file$3, 16, 4, 353);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "text");
    			add_location(input, file$3, 20, 8, 478);
    			attr_dev(div1, "class", "body-service");
    			add_location(div1, file$3, 19, 4, 442);
    			attr_dev(button, "class", "decorative-button");
    			add_location(button, file$3, 27, 8, 654);
    			attr_dev(div2, "class", "action-service");
    			add_location(div2, file$3, 26, 4, 616);
    			add_location(p1, file$3, 30, 8, 791);
    			attr_dev(div3, "class", "result-service");
    			add_location(div3, file$3, 29, 4, 753);
    			attr_dev(div4, "class", "card-service");
    			add_location(div4, file$3, 15, 0, 321);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div0, p0);
    			append_dev(div4, t1);
    			append_dev(div4, div1);
    			append_dev(div1, input);
    			set_input_value(input, /*valueStrToUpcase*/ ctx[0]);
    			append_dev(div4, t2);
    			append_dev(div4, div2);
    			append_dev(div2, button);
    			append_dev(div4, t4);
    			append_dev(div4, div3);
    			append_dev(div3, p1);
    			append_dev(p1, t5);
    			append_dev(p1, t6);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[3]),
    					listen_dev(button, "click", /*onConvertStrToUpcase*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*valueStrToUpcase*/ 1 && input.value !== /*valueStrToUpcase*/ ctx[0]) {
    				set_input_value(input, /*valueStrToUpcase*/ ctx[0]);
    			}

    			if (dirty & /*resultStrToUpcase*/ 2 && t6_value !== (t6_value = (/*resultStrToUpcase*/ ctx[1] || '-') + "")) set_data_dev(t6, t6_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ConvertToUppercase', slots, []);
    	let valueStrToUpcase = null;
    	let resultStrToUpcase = null;

    	function onConvertStrToUpcase() {
    		if (!valueStrToUpcase) return;
    		$$invalidate(1, resultStrToUpcase = convert.convertToUppercase(valueStrToUpcase));
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ConvertToUppercase> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		valueStrToUpcase = this.value;
    		$$invalidate(0, valueStrToUpcase);
    	}

    	$$self.$capture_state = () => ({
    		convert,
    		valueStrToUpcase,
    		resultStrToUpcase,
    		onConvertStrToUpcase
    	});

    	$$self.$inject_state = $$props => {
    		if ('valueStrToUpcase' in $$props) $$invalidate(0, valueStrToUpcase = $$props.valueStrToUpcase);
    		if ('resultStrToUpcase' in $$props) $$invalidate(1, resultStrToUpcase = $$props.resultStrToUpcase);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [valueStrToUpcase, resultStrToUpcase, onConvertStrToUpcase, input_input_handler];
    }

    class ConvertToUppercase extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ConvertToUppercase",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\Services\sub-services\ConvertToLowerCase.svelte generated by Svelte v3.55.1 */
    const file$2 = "src\\Services\\sub-services\\ConvertToLowerCase.svelte";

    function create_fragment$2(ctx) {
    	let div4;
    	let div0;
    	let p0;
    	let t1;
    	let div1;
    	let input;
    	let t2;
    	let div2;
    	let button;
    	let t4;
    	let div3;
    	let p1;
    	let t5;
    	let t6_value = (/*resultStrToLowcase*/ ctx[1] || '-') + "";
    	let t6;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div0 = element("div");
    			p0 = element("p");
    			p0.textContent = "Convert String to Lowercase";
    			t1 = space();
    			div1 = element("div");
    			input = element("input");
    			t2 = space();
    			div2 = element("div");
    			button = element("button");
    			button.textContent = "Random";
    			t4 = space();
    			div3 = element("div");
    			p1 = element("p");
    			t5 = text("Result :  ");
    			t6 = text(t6_value);
    			add_location(p0, file$2, 17, 8, 393);
    			attr_dev(div0, "class", "title-service");
    			add_location(div0, file$2, 16, 4, 356);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "text");
    			add_location(input, file$2, 20, 8, 481);
    			attr_dev(div1, "class", "body-service");
    			add_location(div1, file$2, 19, 4, 445);
    			attr_dev(button, "class", "decorative-button");
    			add_location(button, file$2, 27, 8, 658);
    			attr_dev(div2, "class", "action-service");
    			add_location(div2, file$2, 26, 4, 620);
    			add_location(p1, file$2, 30, 8, 796);
    			attr_dev(div3, "class", "result-service");
    			add_location(div3, file$2, 29, 4, 758);
    			attr_dev(div4, "class", "card-service");
    			add_location(div4, file$2, 15, 0, 324);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div0, p0);
    			append_dev(div4, t1);
    			append_dev(div4, div1);
    			append_dev(div1, input);
    			set_input_value(input, /*valueStrToLowcase*/ ctx[0]);
    			append_dev(div4, t2);
    			append_dev(div4, div2);
    			append_dev(div2, button);
    			append_dev(div4, t4);
    			append_dev(div4, div3);
    			append_dev(div3, p1);
    			append_dev(p1, t5);
    			append_dev(p1, t6);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[3]),
    					listen_dev(button, "click", /*onConvertStrToLowcase*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*valueStrToLowcase*/ 1 && input.value !== /*valueStrToLowcase*/ ctx[0]) {
    				set_input_value(input, /*valueStrToLowcase*/ ctx[0]);
    			}

    			if (dirty & /*resultStrToLowcase*/ 2 && t6_value !== (t6_value = (/*resultStrToLowcase*/ ctx[1] || '-') + "")) set_data_dev(t6, t6_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ConvertToLowerCase', slots, []);
    	let valueStrToLowcase = null;
    	let resultStrToLowcase = null;

    	function onConvertStrToLowcase() {
    		if (!valueStrToLowcase) return;
    		$$invalidate(1, resultStrToLowcase = convert.converToLowercase(valueStrToLowcase));
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ConvertToLowerCase> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		valueStrToLowcase = this.value;
    		$$invalidate(0, valueStrToLowcase);
    	}

    	$$self.$capture_state = () => ({
    		convert,
    		valueStrToLowcase,
    		resultStrToLowcase,
    		onConvertStrToLowcase
    	});

    	$$self.$inject_state = $$props => {
    		if ('valueStrToLowcase' in $$props) $$invalidate(0, valueStrToLowcase = $$props.valueStrToLowcase);
    		if ('resultStrToLowcase' in $$props) $$invalidate(1, resultStrToLowcase = $$props.resultStrToLowcase);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		valueStrToLowcase,
    		resultStrToLowcase,
    		onConvertStrToLowcase,
    		input_input_handler
    	];
    }

    class ConvertToLowerCase extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ConvertToLowerCase",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\Services\Services.svelte generated by Svelte v3.55.1 */
    const file$1 = "src\\Services\\Services.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let randomnumberbetween;
    	let t0;
    	let randomstringlength;
    	let t1;
    	let converttouppercase;
    	let t2;
    	let converttolowercase;
    	let current;
    	randomnumberbetween = new RandomNumBetween({ $$inline: true });
    	randomstringlength = new RandomStringLength({ $$inline: true });
    	converttouppercase = new ConvertToUppercase({ $$inline: true });
    	converttolowercase = new ConvertToLowerCase({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(randomnumberbetween.$$.fragment);
    			t0 = space();
    			create_component(randomstringlength.$$.fragment);
    			t1 = space();
    			create_component(converttouppercase.$$.fragment);
    			t2 = space();
    			create_component(converttolowercase.$$.fragment);
    			attr_dev(div, "class", "container-services");
    			add_location(div, file$1, 10, 0, 347);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(randomnumberbetween, div, null);
    			append_dev(div, t0);
    			mount_component(randomstringlength, div, null);
    			append_dev(div, t1);
    			mount_component(converttouppercase, div, null);
    			append_dev(div, t2);
    			mount_component(converttolowercase, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(randomnumberbetween.$$.fragment, local);
    			transition_in(randomstringlength.$$.fragment, local);
    			transition_in(converttouppercase.$$.fragment, local);
    			transition_in(converttolowercase.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(randomnumberbetween.$$.fragment, local);
    			transition_out(randomstringlength.$$.fragment, local);
    			transition_out(converttouppercase.$$.fragment, local);
    			transition_out(converttolowercase.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(randomnumberbetween);
    			destroy_component(randomstringlength);
    			destroy_component(converttouppercase);
    			destroy_component(converttolowercase);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Services', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Services> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		RandomNumberBetween: RandomNumBetween,
    		RandomStringLength,
    		ConvertToUppercase,
    		ConvertToLowerCase
    	});

    	return [];
    }

    class Services extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Services",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.55.1 */
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let navbar;
    	let t;
    	let services;
    	let current;
    	navbar = new Navbar({ $$inline: true });
    	services = new Services({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(navbar.$$.fragment);
    			t = space();
    			create_component(services.$$.fragment);
    			attr_dev(main, "class", "container");
    			add_location(main, file, 8, 0, 131);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(navbar, main, null);
    			append_dev(main, t);
    			mount_component(services, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navbar.$$.fragment, local);
    			transition_in(services.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navbar.$$.fragment, local);
    			transition_out(services.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(navbar);
    			destroy_component(services);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Navbar, Services });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
