/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable no-restricted-syntax */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable jsx-a11y/mouse-events-have-key-events */
/* eslint-disable react/no-array-index-key */
/* eslint-disable no-nested-ternary */
import React, { useCallback, useEffect, useState, DragEvent } from 'react';
import parse from 'html-react-parser';

import { overrideTailwindClasses } from 'tailwind-override';
import { Choice, Script, ScriptMetadata } from '@johnlindquist/kit/types/core';
import { useAtom } from 'jotai';
import { ipcRenderer } from 'electron';
import { motion } from 'framer-motion';

import { ChoiceButtonProps } from '../types';
import {
  flagsAtom,
  flagValueAtom,
  isMouseDownAtom,
  _modifiers,
} from '../jotai';
import { ReactComponent as MoreThanIcon } from '../svg/ui/icons8-more-than.svg';
import { ReactComponent as NoImageIcon } from '../svg/ui/icons8-no-image.svg';
import { AppChannel } from '../enums';

function highlight(
  string: string,
  matches: [number, number][],
  className: string
) {
  const substrings = [];
  let previousEnd = 0;

  if (matches?.length) {
    for (const [start, end] of matches) {
      const prefix = string.substring(previousEnd, start);
      const match = (
        <mark className={className}>{string.substring(start, end)}</mark>
      );

      substrings.push(prefix, match);
      previousEnd = end;
    }
  }
  substrings.push(string.substring(previousEnd));

  return <span>{React.Children.toArray(substrings)}</span>;
}

function isScript(choice: Choice | Script): choice is Script {
  return (choice as Script)?.command !== undefined;
}

function isNotScript(choice: Choice | Script): choice is Script {
  return (choice as Script)?.command === undefined;
}

export default function ChoiceButton({
  data,
  index,
  style,
}: ChoiceButtonProps) {
  const {
    choices,
    currentIndex,
    mouseEnabled,
    onIndexChange,
    onIndexSubmit,
  } = data;
  const scoredChoice = choices[index];
  const choice: Choice | Script = scoredChoice?.item || scoredChoice;

  const [isMouseDown] = useAtom(isMouseDownAtom);
  const [flags] = useAtom(flagsAtom);
  const [flaggedValue, setFlagValue] = useAtom(flagValueAtom);
  const [modifiers] = useAtom(_modifiers);
  const [modifierDescription, setModifierDescription] = useState('');

  // const dataTransfer = useRef<any>('Data Transfer');

  const onRightClick = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      setFlagValue(choice);
    },
    [choice, setFlagValue]
  );

  const onClick = useCallback(
    (e) => {
      e.preventDefault();
      onIndexSubmit(index);
    },
    [index, onIndexSubmit]
  );
  const onMouseEnter = useCallback(() => {
    if (mouseEnabled) {
      onIndexChange(index);
    }
  }, [index, mouseEnabled, onIndexChange]);

  const [imageFail, setImageFail] = useState(false);

  useEffect(() => {
    setImageFail(false);
  }, [choice]);

  const onDragStart = useCallback(
    (event: DragEvent) => {
      if (choice?.drag) {
        const drag = choice?.drag;
        if (typeof drag === 'string') {
          event.preventDefault();

          ipcRenderer.send(AppChannel.DRAG_FILE_PATH, {
            filePath: drag,
            icon: '',
          });
        } else {
          // const domString = `text/plain:script.js:${URL.createObjectURL(
          //   new Blob([dragContents as string], {
          //     type: 'text/plain;charset=utf-8',
          //   })
          // )}`;
          event.dataTransfer?.setData(
            drag?.format || 'text/plain',
            drag?.data || `please set drag.data`
          );
        }
      }
    },
    [choice]
  );

  useEffect(() => {
    const modifier = modifiers.find((m) => {
      return Object.keys(choice).includes(m);
    }) as keyof ScriptMetadata;

    setModifierDescription(((choice as unknown) as ScriptMetadata)?.[modifier]);
  }, [modifiers]);

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <button
      type="button"
      {...(choice?.drag
        ? {
            draggable: true,
            onDragStart,
          }
        : {})}
      onContextMenu={onRightClick}
      style={{
        cursor: mouseEnabled
          ? choice?.drag
            ? isMouseDown
              ? 'grabbing'
              : 'grab'
            : 'pointer'
          : 'none',
        ...style,
      }}
      className={`

      ${
        index === currentIndex
          ? `bg-black bg-opacity-[0.05]
          dark:bg-white dark:bg-opacity-5
            ${
              mouseEnabled
                ? `active:bg-opacity-10 active:dark:bg-opacity-10`
                : ``
            }
            `
          : ``
      } ${overrideTailwindClasses(`
        w-full
        h-16
        flex-shrink-0
        whitespace-nowrap
        text-left
        flex
        flex-row
        px-4
        justify-between
        items-center
        focus:outline-none
        transition-shadow ease-in-out duration-200
        ${choice?.className}
        ${index === currentIndex ? `opacity-100` : `opacity-90`}
      `)}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
    >
      {choice?.html ? (
        parse(choice?.html, {
          replace: (domNode: any) => {
            if (domNode?.attribs && index === currentIndex)
              domNode.attribs.class += ' focused';
            return domNode;
          },
        })
      ) : (
        <div className="flex flex-row items-center justify-between w-full h-full">
          <div className="flex flex-row overflow-x-hidden items-center h-full">
            {/* Img */}
            {choice?.img && !imageFail && (
              <motion.img
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.1 }}
                src={choice.img}
                alt={choice.description || ''}
                onError={() => setImageFail(true)}
                className={`
                h-12 rounded
                mr-2
                ${index === currentIndex ? `opacity-100` : `opacity-80`}
                `}
              />
            )}
            <div className="flex flex-col max-w-full overflow-x-hidden">
              {/* Name */}
              <div className="truncate">
                {highlight(
                  choice.name,
                  scoredChoice?.matches?.name,
                  'bg-primary-dark dark:bg-primary-light dark:bg-opacity-15 bg-opacity-5 text-primary-dark dark:text-primary-light'
                )}
              </div>
              {/* Description */}
              {(choice?.focused ||
                choice?.description ||
                modifierDescription) && (
                <div
                  className={`text-xs truncate transition-opacity ease-in-out duration-200 pb-1 ${
                    index === currentIndex
                      ? `opacity-100 dark:text-primary-light text-primary-dark`
                      : `opacity-60`
                  }

                `}
                >
                  {modifierDescription ||
                  (index === currentIndex && choice?.focused)
                    ? choice?.focused
                    : highlight(
                        choice?.description || '',
                        scoredChoice?.matches?.description,
                        'bg-primary-dark dark:bg-primary-light dark:bg-opacity-15 bg-opacity-15 text-primary-dark dark:text-primary-light'
                      )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-row items-center flex-shrink-0 h-full">
            {isNotScript(choice) && (choice?.tag || choice?.icon) && (
              <div className="flex flex-row items-center">
                {choice?.tag && (
                  <div
                    className={`
              text-xxs font-mono mx-1
              ${index === currentIndex ? `opacity-70` : `opacity-40`}
              `}
                  >
                    {choice.tag}
                  </div>
                )}

                {choice?.icon && (
                  <motion.img
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.1 }}
                    alt="icon"
                    className={`
    border-2 border-black dark:border-white border-opacity-50
    rounded-full
    h-6 mx-1
    `}
                    src={choice?.icon}
                  />
                )}
              </div>
            )}

            {isScript(choice) && (choice?.friendlyShortcut || choice?.kenv) && (
              <div className="flex flex-col px-2">
                {choice?.friendlyShortcut && (
                  <div
                    className={`
              text-xxs font-mono
              ${index === currentIndex ? `opacity-100` : `opacity-40`}
              `}
                  >
                    {highlight(
                      choice.friendlyShortcut,
                      scoredChoice?.matches?.friendlyShortcut,
                      'bg-white bg-opacity-0 text-primary-dark dark:text-primary-light text-opacity-100'
                    )}
                  </div>
                )}
                {choice?.kenv && (
                  <div
                    className={`
              text-xxs font-mono
              ${index === currentIndex ? `opacity-70` : `opacity-40`}
              `}
                  >
                    {highlight(
                      choice.kenv,
                      scoredChoice?.matches?.kenv,
                      'bg-white bg-opacity-0 text-primary-dark dark:text-primary-light'
                    )}
                  </div>
                )}
              </div>
            )}
            {imageFail && (
              <div
                style={{ aspectRatio: '1/1' }}
                className="h-8 flex flex-row items-center justify-center"
              >
                <NoImageIcon
                  className={`
        h-1/2
        fill-current
        transition ease-in
        opacity-50
        dark:text-white text-black

        `}
                  viewBox="0 0 32 32"
                />
              </div>
            )}
            {/* {choice?.img && !imageFail && (
              <motion.img
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.1 }}
                src={choice.img}
                alt={choice.description || ''}
                onError={() => setImageFail(true)}
                className={`
                h-8 rounded
                ${index === currentIndex ? `opacity-100` : `opacity-80`}

              }


              transition ease-in
                `}
              />
            )} */}

            {index === currentIndex &&
              Boolean(Object.keys(flags).length) &&
              !flaggedValue && (
                <div onClick={onRightClick}>
                  <div
                    className={`
                flex items-center justify-center
                    text-xs
                    font-bold
                    rounded

                    bg-white dark:bg-white
                    dark:bg-opacity-10 bg-opacity-10
                    hover:bg-opacity-50 dark:hover:bg-opacity-25
 ml-2
        w-6 h-6
        leading-1
        fill-current
        transition ease-in
        opacity-50
        hover:opacity-80
        text-black dark:text-white
        dark:hover:text-primary-light hover:text-primary-dark

        `}
                  >
                    →
                  </div>
                </div>
              )}
          </div>
        </div>
      )}
    </button>
  );
}
