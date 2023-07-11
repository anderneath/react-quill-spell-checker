import type Quill from 'quill'
import Delta from 'quill-delta'
import { QuillSpellChecker } from '.'
import debug from './debug'
import { MatchesEntity } from './types'

/**
 * Clean all suggestion boxes from an HTML string
 *
 * @param html HTML to clean
 * @returns Cleaned text
 */
export function getCleanedHtml(html: string) {
  return html.replace(/<quill-spck-match .*>(.*)?<\/quill-spck-match>/g, '$1')
}

/**
 * Remove all suggestion boxes from the editor.
 */
export function removeSuggestionBoxes(quillEditor: Quill) {
  debug('Removing suggestion boxes for editor', quillEditor)

  const initialSelection = quillEditor.getSelection()
  const deltas = quillEditor.getContents()

  const deltasWithoutSuggestionBoxes = deltas.ops.map((delta) => {
    if (delta.attributes && delta.attributes['spck-match']) {
      return {
        ...delta,
        attributes: {
          ...delta.attributes,
          'spck-match': null
        }
      }
    }
    return delta
  })

  // @ts-ignore
  quillEditor.setContents(new Delta(deltasWithoutSuggestionBoxes), 'silent')

  if (initialSelection) {
    quillEditor.setSelection(initialSelection, 'silent')
  }
}

/**
 * Manager for the suggestion boxes.
 * This handles inserting and removing suggestion box elements from the editor.
 */
export class SuggestionBoxes {
  constructor(private readonly parent: QuillSpellChecker) {}

  /**
   * Remove all suggestion boxes from the editor.
   */
  public removeSuggestionBoxes() {
    this.parent.preventLoop()
    removeSuggestionBoxes(this.parent.quill)
  }

  /**
   * Insert a suggestion box into the editor.
   *
   * This uses the matches stored in the parent class
   */
  public addSuggestionBoxes() {
    this.parent.matches.forEach((match) => {
      this.parent.preventLoop()

      const ops = new Delta()
        .retain(match.offset)
        .retain(match.length, { 'spck-match': match })
      // @ts-ignore
      this.parent.quill.updateContents(ops, 'silent')

      debug('Adding formatter', 'lt-match', match.offset, match.length)
    })
  }

  /**
   * Insert a suggestion box into the editor.
   *
   * This uses the matches stored in the parent class
   */
  public removeCurrentSuggestionBox(
    currentMatch: MatchesEntity,
    replacement: string
  ) {
    const start = currentMatch.offset + currentMatch.length
    const diff = replacement.length - currentMatch.length
    this.parent.matches = this.parent.matches
      .filter((match) => match.replacements && match.replacements.length > 0)
      .filter((match) => match.offset !== currentMatch.offset)
      .map((match) => {
        if (match.offset > start) {
          match.offset += diff
        }
        return match
      })
    this.addSuggestionBoxes()
  }
}
