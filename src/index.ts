import * as Tone from 'tone'
import * as d3 from 'd3'
import { Frequency } from 'tone/build/esm/core/type/Units'

const notes = [
  'C1',
  'D1',
  'E1',
  'G1',
  'A1',
  'C2',
  'D2',
  'E2',
  'G2',
  'A2',
  'C3',
  'D3',
  'E3',
  'G3',
  'A3',
  'C4',
  'D4',
  'E4',
] as const

type Note = typeof notes[number]

const colours = [
  '#d8973c',
  '#c3dfe0',
  '#5d675b',
  '#5a4085',
  '#8b80f9',
  '#beb8eb',
  '#04c7b0',
  '#db3d50',
  '#f97068',
  '#fffdfd',
]

function* generateColour(): Generator<string> {
  let copy = [...colours]
  while (true) {
    if (copy.length) {
      yield copy.splice(Math.floor(Math.random() * copy.length), 1)[0]
    } else {
      copy = [...colours]
    }
  }
}

const colourGenerator = generateColour()

class Pattern {
  private on: number
  private off: number
  private rotation: number
  private note: Note
  private colour: string
  private toneSequence: Tone.Sequence
  length: number
  constructor(on: number, off: number, rotation: number = 0) {
    this.on = on
    this.off = off
    this.rotation = rotation
    this.note = notes[random(notes.length)]
    this.colour = colourGenerator.next().value
    this.toneSequence = this.buildToneSequenceData()
    this.length = on + off
  }

  buildToneSequenceData() {
    return new Tone.Sequence(
      (time, note) => {
        const pattern = this
        sampler.triggerAttackRelease(note as Frequency, 0.1, time)
        Tone.Draw.schedule(function () {
          const index = (time % (pattern.length / 4)) * 4
          const circle = d3.selectAll(
            `#${pattern.getId()} circle:nth-child(${index + 1})`,
          )
          circle.classed('on active', true)
          setTimeout(() => {
            circle.classed('active', false)
          }, 100)
        }, time)
      },
      this.getPattern()
        .split('')
        .map((bit) => (bit == '1' ? this.getNote() : null)),
    )
  }

  getPattern() {
    return modulatePattern(bjorklund(this.on, this.off), this.rotation)
  }

  getToneSequence() {
    return this.toneSequence
  }

  setToneSequence() {
    this.toneSequence.clear()
    this.toneSequence = this.buildToneSequenceData()
    if (Tone.Transport.state === 'started') {
      this.toneSequence.start(0)
    }
  }

  getNote() {
    return this.note
  }

  setNote(noteIndex: number) {
    this.note = notes[noteIndex]
    this.setToneSequence()
  }

  getColour() {
    return this.colour
  }

  getId() {
    return 'pattern_' + this.getColour().slice(1) + this.getPattern()
  }

  getOn() {
    return this.on
  }

  setOn(value: number) {
    this.on = value
    this.length = value + this.off
    this.setToneSequence()
  }

  getOff() {
    return this.off
  }

  setOff(value: number) {
    this.off = value
    this.length = value + this.on
    this.setToneSequence()
  }

  setRotation(value: number) {
    this.rotation = value
    this.setToneSequence()
  }
}

const patterns: Pattern[] = [new Pattern(random(1, 5), random(3, 5))]

const sampler = new Tone.Sampler({
  urls: notes.reduce((acc, key) => ({ ...acc, [key]: `${key}.mp3` }), {}),
  baseUrl: '/',
}).toDestination()

const controlsContainer = d3
  .select('body')
  .append('div')
  .attr('class', 'controls-container')

controlsContainer
  .append('div')
  .attr('class', 'add-pattern-button-wrapper')
  .append('button')
  .attr('class', 'button')
  .text('+')
  .on('click', () => {
    const pattern = new Pattern(random(1, 10), random(1, 10))
    patterns.push(pattern)
    if (Tone.Transport.state == 'started') {
      pattern.getToneSequence().start(0)
    }
    draw()
    renderControls()
  })

d3.select('body')
  .append('div')
  .attr('class', 'start-button-container')
  .append('button')
  .attr('class', 'button')
  .text('start')
  .on('click', () => {
    Tone.Transport.start(0, 0)
    patterns.forEach((pattern) => {
      pattern.getToneSequence().start(0)
    })
    d3.select('.start-button-container').remove()
  })

function renderControls() {
  const controls = controlsContainer
    .selectAll('div.controls')
    .data(patterns)
    .join('div')
    .attr(
      'class',
      (pattern) => `controls colour-${pattern.getColour().slice(1)}`,
    )
    .text('')

  controls
    .append('input')
    .attr('type', 'range')
    .attr('min', '1')
    .attr('max', '10')
    .attr('step', '1')
    .attr('value', (pattern) => pattern.getOn())
    .on('input', function (_, pattern) {
      pattern.setOn(Number(this.value))
      draw()
    })

  controls
    .append('input')
    .attr('type', 'range')
    .attr('min', '0')
    .attr('max', '10')
    .attr('step', '1')
    .attr('value', (pattern) => pattern.getOff())
    .on('input', function (_, pattern) {
      pattern.setOff(Number(this.value))
      draw()
    })

  controls
    .append('input')
    .attr('type', 'range')
    .attr('min', -10 / 2 - 1)
    .attr('max', 10 / 2 + 1)
    .attr('step', '1')
    .attr('value', 0)
    .on('input', function (_, pattern) {
      pattern.setRotation(Number(this.value))
      draw()
    })

  controls
    .append('input')
    .attr('type', 'range')
    .attr('min', 0)
    .attr('max', notes.length - 1)
    .attr('step', '1')
    .attr('value', (pattern) => notes.indexOf(pattern.getNote()))
    .on('input', function (_, pattern) {
      pattern.setNote(Number(this.value))
      // don't need to draw anything new when note changes
    })

  controls
    .append('button')
    .text((pattern) => (pattern.getToneSequence().mute ? 'unmute' : 'mute'))
    .attr('class', 'button')
    .on('click', function (_, pattern) {
      const toneSequence = pattern.getToneSequence()
      toneSequence.mute = !toneSequence.mute
      // d3.selectAll(`#${pattern.getId()} circle`).classed(
      //   'muted',
      //   toneSequence.mute,
      // )
      renderControls()
      draw()
    })

  controls
    .append('button')
    .text('remove')
    .attr('class', 'button')
    .on('click', function (_, pattern) {
      pattern.getToneSequence().dispose()
      patterns.splice(patterns.indexOf(pattern), 1)
      renderControls()
      draw()
    })
}

const svg = d3
  .select('body')
  .append('svg')
  .attr('viewBox', `0,0,${window.innerWidth},${getHeight()}`)

function draw() {
  // circles
  svg
    .selectAll('g')
    .data(patterns)
    .join('g')
    .attr('transform', `translate(${window.innerWidth / 2},${getHeight() / 2})`)
    .attr('fill', (pattern) => pattern.getColour())
    .attr('id', (pattern) => pattern.getId())
    .selectAll('circle')
    .data((pattern) => pattern.getPattern())
    .join('circle')
    .attr('cx', function (_, i) {
      // @ts-ignore
      const pattern: Pattern = d3.select(this?.parentNode).datum()
      const patternData = pattern.getPattern()
      const radius = 50 * patterns.indexOf(pattern) + 50
      return Math.cos((i * 2 * Math.PI) / patternData.length) * radius
    })
    .attr('cy', function (_, i) {
      // @ts-ignore
      const pattern: Pattern = d3.select(this?.parentNode).datum()
      const patternData = pattern.getPattern()
      const radius = 50 * patterns.indexOf(pattern) + 50
      return Math.sin((i * 2 * Math.PI) / patternData.length) * radius
    })
    .attr('class', function (x, i, t) {
      // @ts-ignore
      const pattern: Pattern = d3.select(this?.parentNode).datum()
      const isMuted = pattern.getToneSequence().mute

      return cx({
        on: x === '1',
        off: x !== '1',
        muted: isMuted,
      })
    })

  // polygons
  svg.selectAll('polygon').remove()

  svg
    .selectAll('g')
    .data(patterns)
    .join('g')
    .append('polygon')
    .attr('stroke', function () {
      // @ts-ignore
      const pattern: Pattern = d3.select(this?.parentNode).datum()
      return pattern.getToneSequence().mute
        ? 'transparent'
        : pattern.getColour()
    })
    .attr('points', function (pattern) {
      return pattern
        .getPattern()
        .split('')
        .reduce((acc: string, current: string, i, array) => {
          if (current === '1') {
            const radius = 50 * patterns.indexOf(pattern) + 50
            return (
              acc +
              Math.cos((i * 2 * Math.PI) / array.length) * radius +
              ',' +
              Math.sin((i * 2 * Math.PI) / array.length) * radius +
              ' '
            )
          }
          return acc
        }, '')
    })
    .attr('fill', 'transparent')
}

window.onresize = debounce(() => {
  svg.attr('viewBox', `0,0,${window.innerWidth},${getHeight()}`)
  svg
    .selectAll('g')
    .attr('transform', `translate(${window.innerWidth / 2},${getHeight() / 2})`)
}, 100)

draw()
renderControls()

function bjorklund(on: number, off: number) {
  let pattern = new Array(on).fill('1').concat(new Array(off).fill('0'))
  let indexOfDiff = 0
  while (indexOfDiff != -1) {
    let remainder = pattern.splice(indexOfDiff)
    pattern = pattern
      .map((sequence, i) => sequence + (remainder[i] || ''))
      .concat(remainder.slice(indexOfDiff))
    indexOfDiff = pattern.findIndex((sequence) => sequence != pattern[0])
  }
  return pattern.join('')
}

function modulatePattern(pattern: string, amount = 1) {
  return pattern.slice(-amount) + pattern.slice(0, -amount)
}

function random(): number
function random(max: number): number
function random(min: number, max: number): number
function random(a?: number, b?: number): number {
  if (a && b) {
    return Math.floor(Math.random() * (b - a) + a)
  }
  if (a) {
    return Math.floor(Math.random() * a)
  }
  return Math.random()
}

function getHeight() {
  return window.innerHeight - 6
}

function debounce(fn: Function, ms = 300) {
  let timeoutId: ReturnType<typeof setTimeout>
  return function (this: any, ...args: any[]) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), ms)
  }
}

function cx(classes: Record<string, boolean>): string {
  return Object.keys(classes).reduce((acc: string, key: string) => {
    if (classes[key]) return acc + ' ' + key
    return acc
  }, '')
}
