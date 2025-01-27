import { SetupContext } from '@vue/composition-api';
import { usePrefixClass } from '../../hooks/useConfig';
import {
  TreeNodeValue,
  TreeProps,
  TypeTreeState,
  TypeTargetNode,
  TypeExpandEventContext,
  TypeActiveEventContext,
  TypeChangeEventContext,
} from '../interface';
import { getNode, emitEvent, pathMatchClass } from '../util';

// tree 组件节点状态设置
export default function useTreeAction(props: TreeProps, context: SetupContext, state: TypeTreeState) {
  const treeState = state;
  const { store } = treeState;
  const componentName = usePrefixClass('tree').value;

  const setExpanded = (item: TypeTargetNode, isExpanded: boolean): TreeNodeValue[] => {
    const node = getNode(store, item);
    const expanded = node.setExpanded(isExpanded, {
      directly: true,
    });
    const mouseEvent = treeState.mouseEvent as MouseEvent;
    const evtCtx: TypeExpandEventContext = {
      node: node.getModel(),
      e: mouseEvent,
      trigger: 'setItem',
    };
    if (mouseEvent) {
      evtCtx.trigger = 'node-click';
      const target = mouseEvent.target as HTMLElement;
      const currentTarget = mouseEvent.currentTarget as HTMLElement;
      if (pathMatchClass(`${componentName}__icon`, target, currentTarget)) {
        evtCtx.trigger = 'icon-click';
      }
    }
    emitEvent<Parameters<TreeProps['onExpand']>>(props, context, 'expand', expanded, evtCtx);
    return expanded;
  };

  const toggleExpanded = (item: TypeTargetNode): TreeNodeValue[] => {
    const node = getNode(store, item);
    return setExpanded(node, !node.isExpanded());
  };

  const setActived = (item: TypeTargetNode, isActived: boolean) => {
    const node = getNode(store, item);
    const actived = node.setActived(isActived, {
      directly: true,
    });
    const mouseEvent = treeState.mouseEvent as MouseEvent;
    const evtCtx: TypeActiveEventContext = {
      node: node.getModel(),
      e: mouseEvent,
      trigger: 'setItem',
    };
    if (mouseEvent) {
      evtCtx.trigger = 'node-click';
    }
    emitEvent<Parameters<TreeProps['onActive']>>(props, context, 'active', actived, evtCtx);
    return actived;
  };

  const toggleActived = (item: TypeTargetNode): TreeNodeValue[] => {
    const node = getNode(store, item);
    return setActived(node, !node.isActived());
  };

  const setChecked = (item: TypeTargetNode, isChecked: boolean, ctx: { e: Event }): TreeNodeValue[] => {
    const node = getNode(store, item);
    const checked = node.setChecked(isChecked, {
      directly: true,
    });
    const mouseEvent = ctx?.e as MouseEvent;
    const evtCtx: TypeChangeEventContext = {
      node: node.getModel(),
      e: mouseEvent,
      trigger: 'setItem',
    };
    if (mouseEvent) {
      evtCtx.trigger = 'node-click';
    }
    emitEvent<Parameters<TreeProps['onChange']>>(props, context, 'change', checked, evtCtx);
    return checked;
  };

  const toggleChecked = (item: TypeTargetNode, ctx: { e: Event }): TreeNodeValue[] => {
    const node = getNode(store, item);
    return setChecked(node, !node.isChecked(), ctx);
  };

  return {
    setExpanded,
    toggleExpanded,
    setActived,
    toggleActived,
    setChecked,
    toggleChecked,
  };
}
