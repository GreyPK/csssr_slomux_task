// Slomux — упрощённая, сломанная реализация Flux.
// Перед вами небольшое приложение, написанное на React + Slomux.
// Это нерабочий секундомер с настройкой интервала обновления.

// Исправьте ошибки и потенциально проблемный код, почините приложение и прокомментируйте своё решение.

// При нажатии на "старт" должен запускаться секундомер и через заданный интервал времени увеличивать свое значение на значение интервала
// При нажатии на "стоп" секундомер должен останавливаться и сбрасывать свое значение
import React, { createContext } from 'react'
import ReactDOM from 'react-dom'

const SlomuxContext = createContext()

const createStore = (reducer, initialState) => {
  let currentState = initialState
  const listeners = []

  const getState = () => currentState
  const dispatch = action => {
    currentState = reducer(currentState, action)
    listeners.forEach(listener => listener())
  }

  const subscribe = listener => {
    listeners.push(listener)

    // Функция должна возвращать отписку
    return function unsubscribe() {
      const index = listeners.indexOf(listener)
      listeners.splice(index, 1)
    }
  }

  return { getState, dispatch, subscribe }
}

const connect = (mapStateToProps, mapDispatchToProps) => Component => {
  class WrappedComponent extends React.Component {
    // сабскайб нужен на маунте
    componentDidMount() {
      this.unsubscribe = this.context.subscribe(this.handleChange)
    }

    // для удаленных компонентов нужно выполнить отписку
    componentWillUnmount() {
      this.unsubscribe()
    }

    handleChange = () => {
      this.forceUpdate()
    }

    render() {
      return (
        <Component
          {...this.props}
          {...mapStateToProps(this.context.getState(), this.props)}
          {...mapDispatchToProps(this.context.dispatch, this.props)}
        />
      )
    }
  }

  // Новый context api
  WrappedComponent.contextType = SlomuxContext

  return WrappedComponent
}

// Устаревший context api заменяем на современный
class Provider extends React.Component {
  render() {
    return (
      <SlomuxContext.Provider value={this.props.store}>
        {this.props.children}
      </SlomuxContext.Provider>
    )
  }
}

// APP

// actions
const CHANGE_INTERVAL = 'CHANGE_INTERVAL'

// action creators
const changeInterval = value => ({
  type: CHANGE_INTERVAL,
  payload: value,
})

// reducers
// Нужен начальный стейт
const reducer = (state = 1, action) => {
  switch (action.type) {
    case CHANGE_INTERVAL:
      return state + action.payload < 0 ? state : (state += action.payload)
    default:
      // нужно возврашать пришедший стейт
      return state
  }
}

// components

class IntervalComponent extends React.PureComponent {
  render() {
    return (
      <div>
        <span>
          Интервал обновления секундомера: {this.props.currentInterval} сек.
        </span>
        <span>
          <button
            type='button'
            onClick={() => this.props.changeInterval(-1)}
            disabled={this.props.currentInterval === 0}
          >
            -
          </button>
          <button type='button' onClick={() => this.props.changeInterval(1)}>
            +
          </button>
        </span>
      </div>
    )
  }
}

const Interval = connect(
  // перепутаны аргументы
  state => ({
    currentInterval: state,
  }),
  dispatch => ({
    changeInterval: value => dispatch(changeInterval(value)),
  })
)(IntervalComponent)

class TimerComponent extends React.PureComponent {
  //для остановки интервала нужно сохранить его в стейте
  state = {
    currentTime: 0,
    intervalId: null,
  }

  componentDidUpdate(prevProps, prevState) {
    if (
      prevProps.currentInterval !== this.props.currentInterval &&
      prevState.intervalId !== null
    ) {
      clearInterval(this.state.intervalId)
      this.handleStart()
    }
  }

  componentWillUnmount() {
    clearInterval(this.state.intervalId)
  }

  render() {
    return (
      <div>
        <Interval />
        <div>Секундомер: {this.state.currentTime} сек.</div>
        <div>
          <button
            type='button'
            onClick={this.handleStart}
            disabled={this.props.currentInterval === 0}
          >
            Старт
          </button>
          <button
            type='button'
            onClick={this.handleStop}
            disabled={this.state.intervalId === null}
          >
            Стоп
          </button>
        </div>
      </div>
    )
  }

  // чтобы не потерять контекст используем arrow function
  handleStart = () => {
    // нужна функция интервала
    // нужно хранить интервал для возможности его удаления
    this.setState({
      intervalId: setInterval(
        () =>
          // нужно передавать не объект, а функцию
          this.setState((state, props) => {
            // counter - не существует в стейте, должно быть currentTime
            return { currentTime: state.currentTime + props.currentInterval }
          }),
        // задержка в миллисекундах
        this.props.currentInterval * 1000
      ),
    })
  }

  // arrow function
  handleStop = () => {
    // удаляем и очищаем интервал
    clearInterval(this.state.intervalId)
    this.setState({ intervalId: null, currentTime: 0 })
  }
}

const Timer = connect(
  state => ({
    currentInterval: state,
  }),
  () => {}
)(TimerComponent)

// не объявлен начальный стейт
const initialState = 1

// init
ReactDOM.render(
  <Provider store={createStore(reducer, initialState)}>
    <Timer />
  </Provider>,
  document.getElementById('app')
)
