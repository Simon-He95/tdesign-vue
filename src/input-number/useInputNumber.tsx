import Vue from 'vue';
import {
  computed, onMounted, ref, SetupContext, toRefs, watch,
} from '@vue/composition-api';
import useCommonClassName from '../hooks/useCommonClassName';
import useVModel from '../hooks/useVModel';
import { InputNumberValue, TdInputNumberProps } from './type';
// 计算逻辑，统一到 common 中，方便各框架复用（如超过 16 位的大数处理）
import {
  canAddNumber,
  canInputNumber,
  canReduceNumber,
  formatToNumber,
  getMaxOrMinValidateResult,
  getStepValue,
} from '../_common/js/input-number/number';
import useFormDisabled from '../hooks/useFormDisabled';

/**
 * 独立一个组件 Hook 方便用户直接使用相关逻辑 自定义任何样式的数字输入框
 */
export default function useInputNumber(props: TdInputNumberProps, context: SetupContext) {
  const { classPrefix, sizeClassNames, statusClassNames } = useCommonClassName();
  const { value, max, min } = toRefs(props);
  // 统一处理受控、非受控、语法糖 v-model 等
  const [tValue, setTValue] = useVModel(value, props.defaultValue, props.onChange, 'change');
  const inputRef = ref<Vue>();
  const userInput = ref('');
  const displayValue = ref();

  const { formDisabled } = useFormDisabled();
  const tDisabled = computed(() => props.disabled || formDisabled.value);

  const isError = ref<'exceed-maximum' | 'below-minimum'>();

  const disabledReduce = computed(
    () => tDisabled.value || !canReduceNumber(tValue.value, props.min, props.largeNumber),
  );

  const disabledAdd = computed(() => tDisabled.value || !canAddNumber(tValue.value, props.max, props.largeNumber));

  const wrapClasses = computed(() => [
    `${classPrefix.value}-input-number`,
    sizeClassNames[props.size],
    {
      [statusClassNames.disabled]: tDisabled.value,
      [`${classPrefix.value}-is-controls-right`]: props.theme === 'column',
      [`${classPrefix.value}-input-number--${props.theme}`]: props.theme,
      [`${classPrefix.value}-input-number--auto-width`]: props.autoWidth,
    },
  ]);

  const reduceClasses = computed(() => [
    `${classPrefix.value}-input-number__decrease`,
    { [statusClassNames.disabled]: disabledReduce.value },
  ]);

  const addClasses = computed(() => [
    `${classPrefix.value}-input-number__increase`,
    { [statusClassNames.disabled]: disabledAdd.value },
  ]);

  const getUserInput = (value: InputNumberValue) => {
    if (!value && value !== 0) return '';
    let inputStr = String(value);
    if (!inputRef.value?.$el?.contains(document.activeElement)) {
      inputStr = String(
        formatToNumber(inputStr, {
          decimalPlaces: props.decimalPlaces,
          largeNumber: props.largeNumber,
        }),
      );
      if (props.format) {
        inputStr = String(props.format(value, { fixedNumber: inputStr }));
      }
    }
    return inputStr;
  };

  watch(
    tValue,
    (val) => {
      const inputValue = [undefined, null].includes(val) ? '' : String(val);
      userInput.value = getUserInput(inputValue);
    },
    { immediate: true },
  );

  onMounted(() => {
    userInput.value = getUserInput(tValue.value);
  });

  watch(
    [tValue, max, min],
    () => {
      // @ts-ignore 没有输入完成，则无需校验
      if ([undefined, '', null].includes(tValue.value)) return;
      const error = getMaxOrMinValidateResult({
        value: tValue.value,
        largeNumber: props.largeNumber,
        max: props.max,
        min: props.min,
      });
      isError.value = error;
      props.onValidate?.({ error });
      context.emit('validate', { error });
    },
    { immediate: true },
  );

  const handleStepValue = (op: 'add' | 'reduce') => getStepValue({
    op,
    step: props.step,
    max: props.max,
    min: props.min,
    lastValue: tValue.value,
    largeNumber: props.largeNumber,
  });

  const handleReduce = (e: KeyboardEvent | MouseEvent) => {
    if (disabledReduce.value || props.readonly) return;
    const newValue = handleStepValue('reduce');
    setTValue(newValue, { type: 'reduce', e });
  };

  const handleAdd = (e: KeyboardEvent | MouseEvent) => {
    if (disabledAdd.value || props.readonly) return;
    const newValue = handleStepValue('add');
    setTValue(newValue, { type: 'add', e });
  };

  const onInnerInputChange = (val: string, ctx: { e: InputEvent }) => {
    if (!canInputNumber(val, props.largeNumber)) return;
    userInput.value = val;
    const isDelete = ctx.e.inputType === 'deleteContentBackward';
    // 大数-字符串；普通数-数字。此处是了将 2e3，2.1e3 等内容转换为数字
    const newVal = isDelete || props.largeNumber || !val ? val : Number(val);
    if (newVal !== tValue.value && !['-', '.', 'e', 'E'].includes(val.slice(-1))) {
      setTValue(newVal, { type: 'input', e: ctx.e });
    }
  };

  const handleBlur = (value: string, ctx: { e: FocusEvent }) => {
    userInput.value = getUserInput(tValue.value);
    const newValue = formatToNumber(value, {
      decimalPlaces: props.decimalPlaces,
      largeNumber: props.largeNumber,
    });
    if (newValue !== value && String(newValue) !== value) {
      setTValue(newValue, { type: 'blur', e: ctx.e });
    }
    props.onBlur?.(newValue, ctx);
    context.emit('blur', newValue, ctx);
  };

  const handleFocus = (value: string, ctx: { e: FocusEvent }) => {
    userInput.value = tValue.value || tValue.value === 0 ? String(tValue.value) : '';
    props.onFocus?.(value, ctx);
    context.emit('focus', value, ctx);
  };

  const handleKeydown = (value: string, ctx: { e: KeyboardEvent }) => {
    const { e } = ctx;
    const keyEvent = {
      ArrowUp: handleAdd,
      ArrowDown: handleReduce,
    };
    const code = e.code || e.key;
    if (keyEvent[code] !== undefined) {
      keyEvent[code](e);
    }
    props.onKeydown?.(value, ctx);
    context.emit('keydown', value, ctx);
  };

  const handleKeyup = (value: string, ctx: { e: KeyboardEvent }) => {
    props.onKeyup?.(value, ctx);
    context.emit('keyup', value, ctx);
  };

  const handleKeypress = (value: string, ctx: { e: KeyboardEvent }) => {
    props.onKeypress?.(value, ctx);
    context.emit('keypress', value, ctx);
  };

  const handleEnter = (value: string, ctx: { e: KeyboardEvent }) => {
    userInput.value = getUserInput(value);
    const newValue = formatToNumber(value, {
      decimalPlaces: props.decimalPlaces,
      largeNumber: props.largeNumber,
    });
    if (newValue !== value && String(newValue) !== value) {
      setTValue(newValue, { type: 'enter', e: ctx.e });
    }
    props.onEnter?.(newValue, ctx);
    context.emit('enter', newValue, ctx);
  };

  const focus = () => {
    (inputRef.value as any).focus();
  };

  const blur = () => {
    (inputRef.value as any).blur();
  };

  const listeners = {
    blur: handleBlur,
    focus: handleFocus,
    keydown: handleKeydown,
    keyup: handleKeyup,
    keypress: handleKeypress,
    enter: handleEnter,
    click: focus,
  };

  return {
    classPrefix,
    wrapClasses,
    reduceClasses,
    addClasses,
    displayValue,
    tDisabled,
    isError,
    listeners,
    userInput,
    tValue,
    inputRef,
    formDisabled,
    focus,
    blur,
    handleReduce,
    handleAdd,
    onInnerInputChange,
  };
}