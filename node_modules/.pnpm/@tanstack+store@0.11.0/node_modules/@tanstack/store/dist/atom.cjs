const require_alien = require('./alien.cjs');

//#region src/atom.ts
function toObserver(nextHandler, errorHandler, completionHandler) {
	const isObserver = typeof nextHandler === "object";
	const self = isObserver ? nextHandler : void 0;
	return {
		next: (isObserver ? nextHandler.next : nextHandler)?.bind(self),
		error: (isObserver ? nextHandler.error : errorHandler)?.bind(self),
		complete: (isObserver ? nextHandler.complete : completionHandler)?.bind(self)
	};
}
const queuedEffects = [];
let cycle = 0;
const { link, unlink, propagate, checkDirty, shallowPropagate } = /* @__PURE__ */ require_alien.createReactiveSystem({
	update(atom) {
		return atom._update();
	},
	notify(effect) {
		queuedEffects[queuedEffectsLength++] = effect;
		effect.flags &= ~require_alien.ReactiveFlags.Watching;
	},
	unwatched(atom) {
		if (atom.depsTail !== void 0) {
			atom.depsTail = void 0;
			atom.flags = require_alien.ReactiveFlags.Mutable | require_alien.ReactiveFlags.Dirty;
			purgeDeps(atom);
		}
	}
});
let notifyIndex = 0;
let queuedEffectsLength = 0;
let activeSub;
let batchDepth = 0;
function batch(fn) {
	try {
		++batchDepth;
		fn();
	} finally {
		if (!--batchDepth) flush();
	}
}
function purgeDeps(sub) {
	const depsTail = sub.depsTail;
	let dep = depsTail !== void 0 ? depsTail.nextDep : sub.deps;
	while (dep !== void 0) dep = unlink(dep, sub);
}
function flush() {
	if (batchDepth > 0) return;
	while (notifyIndex < queuedEffectsLength) {
		const effect = queuedEffects[notifyIndex];
		queuedEffects[notifyIndex++] = void 0;
		effect.notify();
	}
	notifyIndex = 0;
	queuedEffectsLength = 0;
}
function createAsyncAtom(getValue, options) {
	const ref = {};
	const atom = createAtom(() => {
		getValue().then((data) => {
			const internalAtom = ref.current;
			if (internalAtom._update({
				status: "done",
				data
			})) {
				const subs = internalAtom.subs;
				if (subs !== void 0) {
					propagate(subs);
					shallowPropagate(subs);
					flush();
				}
			}
		}, (error) => {
			const internalAtom = ref.current;
			if (internalAtom._update({
				status: "error",
				error
			})) {
				const subs = internalAtom.subs;
				if (subs !== void 0) {
					propagate(subs);
					shallowPropagate(subs);
					flush();
				}
			}
		});
		return { status: "pending" };
	}, options);
	ref.current = atom;
	return atom;
}
function createAtom(valueOrFn, options) {
	const isComputed = typeof valueOrFn === "function";
	const getter = valueOrFn;
	const atom = {
		_snapshot: isComputed ? void 0 : valueOrFn,
		subs: void 0,
		subsTail: void 0,
		deps: void 0,
		depsTail: void 0,
		flags: isComputed ? require_alien.ReactiveFlags.None : require_alien.ReactiveFlags.Mutable,
		get() {
			if (activeSub !== void 0) link(atom, activeSub, cycle);
			return atom._snapshot;
		},
		subscribe(observerOrFn) {
			const obs = toObserver(observerOrFn);
			const observed = { current: false };
			const e = effect(() => {
				atom.get();
				if (!observed.current) observed.current = true;
				else obs.next?.(atom._snapshot);
			});
			return { unsubscribe: () => {
				e.stop();
			} };
		},
		_update(getValue) {
			const prevSub = activeSub;
			const compare = options?.compare ?? Object.is;
			if (isComputed) {
				activeSub = atom;
				++cycle;
				atom.depsTail = void 0;
			} else if (getValue === void 0) return false;
			if (isComputed) atom.flags = require_alien.ReactiveFlags.Mutable | require_alien.ReactiveFlags.RecursedCheck;
			try {
				const oldValue = atom._snapshot;
				const newValue = typeof getValue === "function" ? getValue(oldValue) : getValue === void 0 && isComputed ? getter(oldValue) : getValue;
				if (oldValue === void 0 || !compare(oldValue, newValue)) {
					atom._snapshot = newValue;
					return true;
				}
				return false;
			} finally {
				activeSub = prevSub;
				if (isComputed) atom.flags &= ~require_alien.ReactiveFlags.RecursedCheck;
				purgeDeps(atom);
			}
		}
	};
	if (isComputed) {
		atom.flags = require_alien.ReactiveFlags.Mutable | require_alien.ReactiveFlags.Dirty;
		atom.get = function() {
			const flags = atom.flags;
			if (flags & require_alien.ReactiveFlags.Dirty || flags & require_alien.ReactiveFlags.Pending && checkDirty(atom.deps, atom)) {
				if (atom._update()) {
					const subs = atom.subs;
					if (subs !== void 0) shallowPropagate(subs);
				}
			} else if (flags & require_alien.ReactiveFlags.Pending) atom.flags = flags & ~require_alien.ReactiveFlags.Pending;
			if (activeSub !== void 0) link(atom, activeSub, cycle);
			return atom._snapshot;
		};
	} else atom.set = function(valueOrFn) {
		if (atom._update(valueOrFn)) {
			const subs = atom.subs;
			if (subs !== void 0) {
				propagate(subs);
				shallowPropagate(subs);
				flush();
			}
		}
	};
	return atom;
}
function effect(fn) {
	const run = () => {
		const prevSub = activeSub;
		activeSub = effectObj;
		++cycle;
		effectObj.depsTail = void 0;
		effectObj.flags = require_alien.ReactiveFlags.Watching | require_alien.ReactiveFlags.RecursedCheck;
		try {
			return fn();
		} finally {
			activeSub = prevSub;
			effectObj.flags &= ~require_alien.ReactiveFlags.RecursedCheck;
			purgeDeps(effectObj);
		}
	};
	const effectObj = {
		deps: void 0,
		depsTail: void 0,
		subs: void 0,
		subsTail: void 0,
		flags: require_alien.ReactiveFlags.Watching | require_alien.ReactiveFlags.RecursedCheck,
		notify() {
			const flags = this.flags;
			if (flags & require_alien.ReactiveFlags.Dirty || flags & require_alien.ReactiveFlags.Pending && checkDirty(this.deps, this)) run();
			else this.flags = require_alien.ReactiveFlags.Watching;
		},
		stop() {
			this.flags = require_alien.ReactiveFlags.None;
			this.depsTail = void 0;
			purgeDeps(this);
		}
	};
	run();
	return effectObj;
}

//#endregion
exports.batch = batch;
exports.createAsyncAtom = createAsyncAtom;
exports.createAtom = createAtom;
exports.flush = flush;
exports.toObserver = toObserver;
//# sourceMappingURL=atom.cjs.map