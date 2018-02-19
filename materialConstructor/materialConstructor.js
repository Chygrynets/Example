(function () {
    'use strict';
    angular.module('app')
        .component('materialConstructor', {
            restrict: 'E',
            templateUrl: '/App/Main/directives/materialConstructor.cshtml',
            bindings: {
                formname: '<'
            },
            controllerAs: 'vm',
            controller: ['lookupService', 'abp.services.etender.matirial', '$localStorage',
                function (lookupService, materialAppService, $localStorage) {

                    let vm = this;
                    vm.isSapUser = $localStorage.isSapUser;
                    vm.materialSet = [];
                    let materialCounter = 0;
                    vm.specificationTypes = lookupService.specificationTypes.map(function (type) {
                        return type;
                    });
                    vm.characteristicTypes = [
                        {
                            id: 0,
                            name: 'Текст'
                        },
                        {
                            id: 1,
                            name: 'Перелік значень'
                        }
                    ];

                    vm.getClassificationList = function (type) {
                        /*Отримуємо спискок класифікаторів доступний даному типу специфікації*/
                        lookupService.getClassifications(type.id)
                            .then(function (data) {
                                vm.classificationList = data;
                            });
                    }

                    vm.getMaterialList = function (text) {
                        console.log(vm);
                        vm.materialSet = [];
                        /*Отримуємо всі доступні матеріали*/
                        abp.ui.setBusy(".content_body");
                        let getList = materialAppService.getMatirialList({
                            classificationId: parseInt(vm.classification.id),
                            searchText: text
                        });
                        return getList.then(function (responce) {
                            abp.ui.clearBusy(".content_body");
                            console.log(responce.data);
                            /*Залишаємо лише  перші 10 значень*/
                            /*uib-typeahead у данному випадку не підтримує limitTo*/
                            let data = responce.data.slice(0, 9);
                            //if (responce.data.length === 0) {
                            ////    /*Якщо нема співпадінь - створюємо новий матеріал*/
                            //vm.newMaterial = [];
                            //vm.newMaterial.matirialName = text;
                            //}
                            let sameName = data.some(function (d) {
                                return text === d.matirialName;
                            });
                            if (sameName === false) {
                                data.push({
                                    matirialName: 'Створити ' + text
                                });
                            }
                            console.log(sameName);
                            return data;
                        });
                    }
                    vm.getMaterialCharacteristics = function (material) {
                        /*Отримуємо список характеристик матеріалу*/
                        if (material.matirialId) {
                            vm.newMaterial.matirialCode = parseInt(material.matirialCode);
                            materialAppService.getMatirialCharacteristicList({
                                id: material.matirialId
                            }).success(function (dto) {
                                let data = dto;
                                console.log(data);
                                vm.newMaterial.materialCharacteristics = data;
                                data.forEach(function (o, i) {
                                    o.characteristicEnumValue = o.characteristicEnumValue.join('. ');
                                    o.localId = i;
                                    vm.materialSet.push(o);
                                });
                                materialCounter = vm.materialSet.length;
                                console.log(vm.materialSet);
                                console.log(materialCounter);
                            }).error(function (err) {
                                abp.notify.error(err);
                            });
                        } else {
                            let mName = vm.newMaterial.matirialName.split('Створити ');
                            vm.newMaterial.matirialName = mName[1];
                        }

                    }
                    vm.createNewMaterial = function (material, mId) {
                        /*Створюємо новий матеріал*/
                        console.log(vm);
                        /*Запит на створення матеріалу по назві та коду*/
                        materialAppService.createUpdateMatirial({
                            matirialId: mId,
                            classificationId: vm.classification.id,
                            matirialName: material.matirialName,
                            matirialCode: material.matirialCode
                        }).success(function (materialId) {
                            console.log(materialId);
                            let mSet = vm.materialSet;
                            if (vm.materialSet.length > 0) {
                                /*Цикл запитів на створення характеристик матеріалу*/
                                for (let i = 0; i < mSet.length; i++) {
                                    let matirialCharacteristicId;
                                    let characteristicType;
                                    let characteristicValue;
                                    if (mSet[i].characteristicEnumValue) {
                                        characteristicValue = mSet[i].characteristicEnumValue.split(/\s*[.]\s*/);
                                        characteristicType = 1;
                                    } else {
                                        characteristicType = 0;
                                    }
                                    mSet[i].matirialCharacteristicId ? matirialCharacteristicId = mSet[i].matirialCharacteristicId : matirialCharacteristicId = 0;
                                    console.log(characteristicValue);
                                    materialAppService.createUpdateMatirialCharacteristic({
                                        matirialCharacteristicId: matirialCharacteristicId,
                                        matirialId: materialId,
                                        name: mSet[i].name,
                                        characteristicType: characteristicType,
                                        characteristicEnumValue: characteristicValue,
                                        isRequred: mSet[i].isRequred
                                    }).success(function (matirialCharacteristicId) {
                                        console.log(matirialCharacteristicId);
                                    }).error(function (err) {
                                        abp.notify.error(err);
                                    });
                                }

                            }
                            mId === 0 ? abp.notify.success('Матеріал створено') : abp.notify.info('Дані по матеріалу оновлено');
                            vm.materialSet = [];
                            vm.newMaterial = [];
                        }).error(function (err) {
                            abp.notify.error(err);
                        });
                    }

                    vm.softDeleteMaterial = function () {
                        materialAppService.deleteMatirial({
                            id: vm.newMaterial.matirialId
                        }).success(function (success) {
                            vm.materialSet = [];
                            vm.newMaterial = [];
                            abp.notify.success('Матеріал видалено')
                        })
                            .error(function (err) {
                                abp.notify.error(err);
                            });

                    }
                    vm.addNewCharacteristic = function () {
                        /*Додаємо параметри матеріалу*/
                        materialCounter++;
                        let newAttrNo = materialCounter;
                        vm.materialSet.push({ localId: newAttrNo });
                    }
                    vm.removeNewCharacteristic = function (index) {
                        /*Видаляємо останній параметр матеріалу*/
                        vm.materialSet.splice(index, 1);
                        console.log(vm.materialSet);
                    };
                }]
        });
})();