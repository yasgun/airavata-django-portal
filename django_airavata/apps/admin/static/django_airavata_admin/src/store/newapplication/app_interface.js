import Vue from 'vue'
import Utils from '../../utils'

var initialState = function () {
  return {
    applicationInputs:{},
    applicationOutputs:{},
    counter:0,
    initialized:false,
    archiveWorkingDirectory:null,
    hasOptionalFileInputs:null,
    missingFields:false,
    fetch:false
  }
}

export default{
  namespaced: true,
  state:initialState(),
  mutations:{
    createAppInterfaceInputFieldObject(state,id){
      Vue.set(state.applicationInputs,id,{
        input_id: id,
        name: '',
        value: '',
        type: '',
        applicationArgument: '',
        userFriendlyDescription:'',
        inputOrder:'',
        dataStaged: false,
        isRequired: false,
        requiredToAddedToCommandLine: false,
        isReadOnly:false,
        standardInput:false
      });
    },
    createAppInterfaceOutputFieldObject:function (state, id) {
      Vue.set(state.applicationOutputs,id,{
        input_id: id,
        name: '',
        value: '',
        type: '',
        applicationArgument: '',
        isRequired: false,
        requiredToAddedToCommandLine: false,
        dataMovement:false,
      });
    },
    updateAppInterfaceField:function (state, param) {
      var id=param.id
      var updateValue=param.update
      var fields=Object.assign({},state[param.fieldType])
      var inpField=fields[id]
      var keys=Object.keys(updateValue)
      for(var prop in updateValue){
        if(inpField.hasOwnProperty(prop)){
          inpField[prop]=updateValue[prop];
        }
      }
      Vue.set(state,param.fieldType,fields)
    },
    setInitialize:function (state, intitalized) {
      state.initialized=intitalized
    },
    removeAppInterfaceField:function (state, params) {
      var fields=state[params.fieldType];
      delete fields[params.id];
      Vue.set(state,params.fieldType,Object.assign({},fields))
    },
    deleteAllFields:function (state,fieldType) {
      Vue.set(state,fieldType,{})
    },
    setArchiveWorkingDirectory:function (state,value) {
      state.archiveWorkingDirectory=value
    },
    setEnableOutputFileInput:function (state,value) {
      state.hasOptionalFileInputs=value
    },
    setMissingField:function (state,value) {
      state.missingFields=value;
    }
  },
  getters:{
    isMissing:state=>{
      return state.missingFields;
    },
    getAppInputField:state=>id=>{
      return state.applicationInputs[id];
    },
    getAppOutputField:state=>id=>{
      return state.applicationOutputs[id]
    },
    isInitialized:state=>{
      return state.initialized;
    },
    getAppInputFieldValue:state=>param=>{
      var val=state.applicationInputs[param.id][param['fieldName']]
      return val
    },
    getAppOutputFieldValue:state=>param=>{
      return state.applicationOutputs[param.id][param['fieldName']]
    },
    isEnableArchiveWorkingDirectory:state=>state.archiveWorkingDirectory,
    isEnableOutputFileInput:state=>state.hasOptionalFileInputs,
    getAppapplicationInputs:state=>{
      return state.applicationInputs;
    },
    getAppapplicationOutputs:state=>{
      return state.applicationOutputs
    },
    getAppInputFieldIds: state=>{
      var ids=Object.getOwnPropertyNames(state.applicationInputs)
      ids.splice(ids.indexOf('__ob__'),1)
      return ids;
    },
    getAppOutputFieldIds:state=>{
      var ids=Object.getOwnPropertyNames(state.applicationOutputs)
      ids.splice(ids.indexOf('__ob__'),1)
      return ids;
    },
    getAppInterface:state=>{
      var data={
        applicationInputs:state.applicationInputs,
        applicationOutputs:state.applicationOutputs,
        archiveWorkingDirectory:state.archiveWorkingDirectory,
        hasOptionalFileInputs:state.hasOptionalFileInputs
      }
    }



  },
  actions: {
    createAppInterfaceInputField: function (context, id = null) {
      if (id == null || !context.state.applicationInputs.hasOwnProperty(id)) {
        id = (context.state.counter++).toString();
        context.commit('createAppInterfaceInputFieldObject', id);
      }
      return id;
    },
    createAppInterfaceOutputField: function (context, id = null) {
      if (id == null || !context.state.applicationInputs.hasOwnProperty(id)) {
        id = (context.state.counter++).toString();
        context.commit('createAppInterfaceOutputFieldObject', id);
      }
      return id;
    },
    deleteAppInterfaceInputField: function (context, id) {
      context.commit('removeAppInterfaceField', {'fieldType': 'applicationInputs', 'id': id});
    },
    deleteAppInterfaceOutputField: function (context, id) {
      context.commit('removeAppInterfaceField', {'fieldType': 'applicationOutputs', 'id': id});
    },
    updateInputFieldValues: function (context, param) {
      param['fieldType'] = 'applicationInputs'
      context.commit('updateAppInterfaceField', param)
    },
    updateOutputField: function (context, param) {
      param['fieldType'] = 'applicationOutputs'
      context.commit('updateAppInterfaceField', param)
    },
    initialized: function (context, initialize) {
      context.commit('setInitialize', initialize)
    },
    changeEnableOutputFileInput: function (context, value) {
      context.commit('setEnableOutputFileInput', value)
    },
    changeArchiveWorkingDirectory: function (context, value) {
      context.commit('setArchiveWorkingDirectory', value)
    },
    triggerMissingField: function (context, value) {
      context.commit('setMissingField', value)
    },
    fetch: function ({state, commit, rootState}) {
    },
    saveApplicationInterface: function ({state, context, rootState},{success = (val) => console.log("App Interface", value), failure = (val) => console.log("Saving failed", value)} = {}) {
      var appInterface = {}
      appInterface.applicationInputs = Utils.convertKeyValuePairObjectToValueArray(state.applicationInputs)
      appInterface.applicationOutputs = Utils.convertKeyValuePairObjectToValueArray(state.applicationOutputs)
      appInterface.archiveWorkingDirectory = state.archiveWorkingDirectory
      appInterface.hasOptionalFileInputs = state.hasOptionalFileInputs
      appInterface.applicationName = rootState.newApplication.appDetailsTab.name
      appInterface.applicationDescription = rootState.newApplication.appDetailsTab.description
      appInterface.applicationModules=[rootState.newApplication.appDetailsTab.appModuleId]
      appInterface.applicationName=rootState.newApplication.appDetailsTab.name
      appInterface.applicationDescription=rootState.newApplication.appDetailsTab.description
      console.log("Application Interface:", appInterface)
      return Utils.post('/api/new/application/interface', appInterface,{success:success,failure:failure})
    },
    initializeAppInterface:function ({commit, state, rootState},mount){
     var success=function (value) {
       if(value.applicationInputs){
         var temp={}
         for(var i=0;i< value.applicationInputs.length;i++){
           temp[state.counter]=value.applicationInputs[i]
           temp[state.counter].input_id=state.counter
           state.counter=state.counter+1
         }
         value.applicationInputs=temp
       }
       if(value.applicationOutputs){
           var temp={}
         for(var i=0; i< value.applicationOutputs.length;i++){
           temp[state.counter]=value.applicationOutputs[i]
           temp[state.counter].input_id=state.counter
           state.counter=state.counter+1
         }
         value.applicationOutputs=temp
       }
       Utils.resetData(state,value)
       rootState.newApplication.appInterfaceTabInitialized=false
       mount()
     }
     if(rootState.newApplication.appInterfaceTabInitialized){
        Utils.get('/api/application/interface',{queryParams:{id:rootState.newApplication.appDetailsTab.appModuleId},success:success})
     }else {
       mount()
     }
    },
    resetState:function ({commit,state,rootState}) {
      console.log()
      Utils.resetData(state,initialState())
    }
  }
}
