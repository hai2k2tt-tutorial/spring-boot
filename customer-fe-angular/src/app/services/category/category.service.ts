import {Injectable} from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {Observable} from "rxjs";
import {CategoryRequestDto, CategoryResponseVo} from "../../model/api";

@Injectable({
  providedIn: 'root'
})
export class CategoryService {

  constructor(private httpClient: HttpClient) {
  }

  getCategories(): Observable<Array<CategoryResponseVo>> {
    return this.httpClient.get<Array<CategoryResponseVo>>('/api/categories');
  }

  createCategory(category: CategoryRequestDto): Observable<CategoryResponseVo> {
    return this.httpClient.post<CategoryResponseVo>('/api/categories', category);
  }
}
